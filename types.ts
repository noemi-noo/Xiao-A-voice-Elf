export interface ChatMessage {
  id: string;
  role: 'user' | 'model' | 'system';
  text: string;
  timestamp: Date;
  isFinal?: boolean;
}

export interface VoiceConfig {
  voiceName: 'Puck' | 'Charon' | 'Kore' | 'Fenrir' | 'Zephyr';
}

export interface LiveSessionState {
  isConnected: boolean;
  isConnecting: boolean;
  isSpeaking: boolean;
  volume: number;
  error: string | null;
}
