import { useState, useRef, useEffect, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { createAudioBlob, decodeBase64, decodeAudioData } from '../utils/audio';
import { MODEL_NAME, SYSTEM_INSTRUCTION, DEFAULT_VOICE_NAME } from '../constants';
import { ChatMessage, LiveSessionState } from '../types';

export const useLiveSession = () => {
  const [state, setState] = useState<LiveSessionState>({
    isConnected: false,
    isConnecting: false,
    isSpeaking: false,
    volume: 0,
    error: null,
  });

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  
  // Refs for audio handling to avoid re-renders
  const audioContextRef = useRef<AudioContext | null>(null);
  const inputContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const activeSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const sessionPromiseRef = useRef<Promise<any> | null>(null);

  // Transcripts buffering
  const currentInputTranscription = useRef('');
  const currentOutputTranscription = useRef('');

  const disconnect = useCallback(() => {
    // Stop microphone
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    // Stop audio processing
    if (processorRef.current && inputContextRef.current) {
      processorRef.current.disconnect();
      sourceRef.current?.disconnect();
    }
    
    // Stop playback
    activeSourcesRef.current.forEach(source => source.stop());
    activeSourcesRef.current.clear();

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    
    if (inputContextRef.current) {
      inputContextRef.current.close();
      inputContextRef.current = null;
    }

    // Attempt to close session if possible (API limitation: strict close method might not be exposed on the promise result directly in all SDK versions, but we stop sending)
    // In the provided example, session.close() is mentioned.
    if (sessionPromiseRef.current) {
        sessionPromiseRef.current.then(session => {
            try {
                session.close();
            } catch (e) {
                console.warn("Error closing session", e);
            }
        });
        sessionPromiseRef.current = null;
    }

    setState(prev => ({ ...prev, isConnected: false, isConnecting: false, isSpeaking: false }));
  }, []);

  const connect = useCallback(async () => {
    if (state.isConnected || state.isConnecting) return;

    setState(prev => ({ ...prev, isConnecting: true, error: null }));

    try {
      const apiKey = process.env.API_KEY;
      if (!apiKey) throw new Error("API Key not found");

      const ai = new GoogleGenAI({ apiKey });

      // Initialize Audio Contexts
      // Input: 16kHz for Gemini
      const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      inputContextRef.current = inputCtx;
      
      // Output: 24kHz for high quality response
      const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      audioContextRef.current = outputCtx;
      nextStartTimeRef.current = 0;

      // Get Microphone Stream
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Connect to Gemini
      const sessionPromise = ai.live.connect({
        model: MODEL_NAME,
        callbacks: {
          onopen: () => {
            console.log('Gemini Live Session Opened');
            setState(prev => ({ ...prev, isConnected: true, isConnecting: false }));

            // Start processing microphone input
            const source = inputCtx.createMediaStreamSource(stream);
            sourceRef.current = source;
            
            // 4096 buffer size, 1 input channel, 1 output channel
            const processor = inputCtx.createScriptProcessor(4096, 1, 1);
            processorRef.current = processor;

            processor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              // Calculate volume for visualizer
              let sum = 0;
              for (let i = 0; i < inputData.length; i++) {
                sum += inputData[i] * inputData[i];
              }
              const rms = Math.sqrt(sum / inputData.length);
              // Update volume state slightly throttled or just set it (React batching helps)
              // For performance, maybe don't set state on every chunk in a real huge app, but here it's fine.
              if (rms > 0.01) {
                  // only update if significant to reduce renders
                  setState(prev => ({...prev, volume: rms}));
              }

              const pcmBlob = createAudioBlob(inputData);
              sessionPromise.then(session => {
                session.sendRealtimeInput({ media: pcmBlob });
              });
            };

            source.connect(processor);
            processor.connect(inputCtx.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            // Handle Audio Output
            const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (base64Audio) {
                // Ensure output context is running
                if (outputCtx.state === 'suspended') {
                    await outputCtx.resume();
                }

                const audioData = decodeBase64(base64Audio);
                nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputCtx.currentTime);
                
                const audioBuffer = decodeAudioData(audioData, outputCtx, 24000, 1);
                
                const source = outputCtx.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(outputCtx.destination);
                
                source.onended = () => {
                    activeSourcesRef.current.delete(source);
                    if (activeSourcesRef.current.size === 0) {
                        setState(prev => ({ ...prev, isSpeaking: false }));
                    }
                };

                activeSourcesRef.current.add(source);
                setState(prev => ({ ...prev, isSpeaking: true }));
                
                source.start(nextStartTimeRef.current);
                nextStartTimeRef.current += audioBuffer.duration;
            }

            // Handle Interruption
            if (message.serverContent?.interrupted) {
                console.log("Interrupted!");
                activeSourcesRef.current.forEach(s => s.stop());
                activeSourcesRef.current.clear();
                nextStartTimeRef.current = 0;
                setState(prev => ({ ...prev, isSpeaking: false }));
            }

            // Handle Transcriptions
            if (message.serverContent?.outputTranscription) {
                currentOutputTranscription.current += message.serverContent.outputTranscription.text;
            }
            if (message.serverContent?.inputTranscription) {
                currentInputTranscription.current += message.serverContent.inputTranscription.text;
            }

            if (message.serverContent?.turnComplete) {
                const userText = currentInputTranscription.current;
                const modelText = currentOutputTranscription.current;

                if (userText.trim()) {
                    setMessages(prev => [...prev, {
                        id: Date.now().toString() + '-user',
                        role: 'user',
                        text: userText,
                        timestamp: new Date(),
                        isFinal: true
                    }]);
                }
                if (modelText.trim()) {
                    setMessages(prev => [...prev, {
                        id: Date.now().toString() + '-model',
                        role: 'model',
                        text: modelText,
                        timestamp: new Date(),
                        isFinal: true
                    }]);
                }

                currentInputTranscription.current = '';
                currentOutputTranscription.current = '';
            }
          },
          onclose: () => {
            console.log("Session Closed");
            disconnect();
          },
          onerror: (err) => {
            console.error("Session Error", err);
            setState(prev => ({ ...prev, error: "Connection error occurred.", isConnected: false, isConnecting: false }));
          }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: DEFAULT_VOICE_NAME } }
          },
          systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
          inputAudioTranscription: { model: MODEL_NAME },
          outputAudioTranscription: { model: MODEL_NAME },
        }
      });
      
      sessionPromiseRef.current = sessionPromise;

    } catch (error: any) {
      console.error("Connection Failed", error);
      setState(prev => ({ 
        ...prev, 
        isConnecting: false, 
        error: error.message || "Failed to start conversation" 
      }));
    }
  }, [disconnect, state.isConnected, state.isConnecting]);

  return {
    ...state,
    messages,
    connect,
    disconnect
  };
};
