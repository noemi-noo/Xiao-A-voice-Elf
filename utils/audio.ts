import { Blob } from '@google/genai';

/**
 * Encodes Float32 audio data (from AudioContext) into 16-bit PCM binary string,
 * then converts to base64.
 */
export function encodePCM(data: Float32Array): string {
  let binary = '';
  const len = data.length;
  // Convert Float32 -1.0..1.0 to Int16 -32768..32767
  for (let i = 0; i < len; i++) {
    const s = Math.max(-1, Math.min(1, data[i]));
    const int16 = s < 0 ? s * 0x8000 : s * 0x7FFF;
    // Little endian storage
    const charCode = Math.floor(int16); 
    // Using simple char conversion for the example standard
    // Note: The example provided in prompt uses a specific Int16Array approach
    // We will follow that strictly.
    // However, the example `encode` function takes Uint8Array bytes.
    // So we first create the Int16Array, then view it as Uint8Array.
  }
  
  const int16Array = new Int16Array(len);
  for (let i = 0; i < len; i++) {
    int16Array[i] = data[i] * 32768;
  }
  const bytes = new Uint8Array(int16Array.buffer);
  
  const l = bytes.byteLength;
  for (let i = 0; i < l; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Creates a GenAI compatible Blob from raw float audio data
 */
export function createAudioBlob(data: Float32Array): Blob {
  return {
    data: encodePCM(data),
    mimeType: 'audio/pcm;rate=16000',
  };
}

/**
 * Decodes a base64 string into a Uint8Array
 */
export function decodeBase64(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Decodes raw PCM data (Int16) into an AudioBuffer
 */
export function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number = 24000,
  numChannels: number = 1
): AudioBuffer {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      // Convert Int16 back to Float32
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}
