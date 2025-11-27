import React, { useEffect, useState } from 'react';

interface VisualizerProps {
  isSpeaking: boolean;
  volume: number; // 0 to 1 (normalized-ish)
  isConnected: boolean;
}

const Visualizer: React.FC<VisualizerProps> = ({ isSpeaking, volume, isConnected }) => {
  const [scale, setScale] = useState(1);

  useEffect(() => {
    if (isConnected) {
      // Simple animation driver based on volume or speaking state
      const targetScale = 1 + Math.min(volume * 5, 0.5); // Cap expansion
      const smoothScale = scale + (targetScale - scale) * 0.2;
      
      // If no volume data but system says speaking (output), pulse gently
      if (isSpeaking && volume < 0.01) {
          const time = Date.now() / 300;
          setScale(1 + Math.sin(time) * 0.1);
      } else {
          setScale(smoothScale);
      }
      
      let animationFrame: number;
      const animate = () => {
          if (isSpeaking) {
               // If speaking output, pulse sine wave
               const t = Date.now() / 200;
               setScale(1 + Math.sin(t) * 0.15);
          } else {
               // If user speaking (input volume), react to volume
               const v = Math.max(0.1, Math.min(volume * 10, 0.8));
               setScale(1 + v);
          }
          animationFrame = requestAnimationFrame(animate);
      };
      
      // For this simple version, let's just use CSS transitions controlled by props/interval
      // actually, let's use a simple interval for the "idle" or "speaking" pulse if volume is low
    } else {
        setScale(1);
    }
  }, [volume, isSpeaking, isConnected]);

  return (
    <div className="relative flex items-center justify-center h-64 w-64">
      {/* Outer Glow */}
      <div 
        className={`absolute rounded-full transition-all duration-100 ease-out bg-cyan-500 blur-xl opacity-30`}
        style={{ 
            width: `${scale * 100}%`, 
            height: `${scale * 100}%`,
            opacity: isConnected ? 0.4 : 0
        }}
      />
      
      {/* Main Circle */}
      <div 
        className={`relative z-10 w-32 h-32 rounded-full flex items-center justify-center transition-all duration-500 shadow-lg border-4 
            ${isConnected 
                ? 'bg-gradient-to-br from-cyan-400 to-blue-600 border-cyan-200 shadow-cyan-500/50' 
                : 'bg-gray-700 border-gray-600 shadow-none'
            }`}
      >
        <div className={`text-4xl transition-opacity duration-300 ${isConnected ? 'opacity-100' : 'opacity-40'}`}>
             {isConnected ? (isSpeaking ? '💬' : '👂') : '💤'}
        </div>
      </div>

      {/* Ripple Rings when active */}
      {isConnected && (
        <>
            <div className="absolute w-40 h-40 border border-cyan-500/30 rounded-full animate-ping" style={{ animationDuration: '3s' }}></div>
            <div className="absolute w-40 h-40 border border-purple-500/20 rounded-full animate-ping" style={{ animationDuration: '2s', animationDelay: '0.5s' }}></div>
        </>
      )}
    </div>
  );
};

export default Visualizer;
