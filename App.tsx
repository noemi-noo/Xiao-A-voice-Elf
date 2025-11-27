import React from 'react';
import { useLiveSession } from './hooks/useLiveSession';
import Visualizer from './components/Visualizer';
import ChatLog from './components/ChatLog';
import Controls from './components/Controls';

const App: React.FC = () => {
  const { 
    isConnected, 
    isConnecting, 
    isSpeaking, 
    volume, 
    messages, 
    error,
    connect, 
    disconnect 
  } = useLiveSession();

  return (
    <div className="h-screen w-full flex flex-col bg-gray-900 text-white font-sans">
      {/* Header */}
      <header className="p-4 flex items-center justify-between border-b border-gray-800 bg-gray-900 z-20">
        <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse"></div>
            <h1 className="text-lg font-bold tracking-tight text-cyan-100">Xiao A <span className="text-xs font-normal text-cyan-500/70 ml-1">Live Preview</span></h1>
        </div>
        <div className="text-xs font-mono text-gray-500 border border-gray-800 px-2 py-1 rounded">
            Gemini 2.5
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col relative overflow-hidden">
        
        {/* Visualizer Area (Fixed Top or Split) */}
        <div className="flex-shrink-0 flex items-center justify-center py-8 bg-gradient-to-b from-gray-900 to-gray-800/50">
            <Visualizer 
                isConnected={isConnected} 
                isSpeaking={isSpeaking} 
                volume={volume} 
            />
        </div>

        {/* Chat Log (Scrollable) */}
        <div className="flex-1 flex flex-col min-h-0 bg-gray-900/50 backdrop-blur-sm relative z-10 border-t border-gray-800/50">
           <div className="absolute top-0 left-0 w-full h-4 bg-gradient-to-b from-gray-900/50 to-transparent pointer-events-none z-10"/>
           <ChatLog messages={messages} />
        </div>

      </main>

      {/* Controls */}
      <Controls 
        isConnected={isConnected}
        isConnecting={isConnecting}
        onConnect={connect}
        onDisconnect={disconnect}
        error={error}
      />
    </div>
  );
};

export default App;
