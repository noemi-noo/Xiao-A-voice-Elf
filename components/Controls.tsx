import React from 'react';

interface ControlsProps {
  isConnected: boolean;
  isConnecting: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
  error: string | null;
}

const Controls: React.FC<ControlsProps> = ({ isConnected, isConnecting, onConnect, onDisconnect, error }) => {
  return (
    <div className="flex flex-col items-center gap-4 p-6 bg-gray-900/80 backdrop-blur-md sticky bottom-0 w-full border-t border-gray-800">
      
      {error && (
        <div className="text-red-400 text-sm bg-red-900/20 px-4 py-2 rounded-lg mb-2">
            {error}
        </div>
      )}

      <button
        onClick={isConnected ? onDisconnect : onConnect}
        disabled={isConnecting}
        className={`
          relative group flex items-center justify-center w-16 h-16 rounded-full transition-all duration-300 shadow-xl
          ${isConnected 
            ? 'bg-red-500 hover:bg-red-600 text-white shadow-red-500/30' 
            : 'bg-cyan-500 hover:bg-cyan-400 text-white shadow-cyan-500/30'
          }
          ${isConnecting ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
         {/* Icon */}
         {isConnecting ? (
            <svg className="animate-spin h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
         ) : isConnected ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
         ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
         )}
         
         {/* Ping effect when not connected to encourage click */}
         {!isConnected && !isConnecting && (
             <span className="absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-20 animate-ping"></span>
         )}
      </button>
      
      <div className="text-gray-400 text-sm font-medium">
        {isConnecting ? "Connecting..." : isConnected ? "Tap to disconnect" : "Tap to speak with Xiao A"}
      </div>
    </div>
  );
};

export default Controls;
