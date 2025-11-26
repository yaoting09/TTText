import React, { useState, useEffect } from 'react';
import FluidCanvas from './components/FluidCanvas';
import { generateArtConfig } from './services/geminiService';
import { ArtConfig } from './types';
import { ArrowDownTrayIcon, SparklesIcon, AdjustmentsHorizontalIcon, XMarkIcon } from '@heroicons/react/24/solid';

// Initial default configuration - Black & White Aesthetic
const DEFAULT_CONFIG: ArtConfig = {
  colors: ['#000000', '#1a1a1a', '#333333'],
  speed: 2.5,
  chaos: 0.002,
  blurLevel: 0.1,
  particleCount: 3000,
  flowAngle: 0, // 0 Degrees = Right
  moodDescription: "Monochrome Flow",
};

const App: React.FC = () => {
  const [input, setInput] = useState('EVOLVE');
  const [displayText, setDisplayText] = useState('EVOLVE');
  const [config, setConfig] = useState<ArtConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(false);
  const [canvasRef, setCanvasRef] = useState<HTMLCanvasElement | null>(null);
  const [hideUI, setHideUI] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const handleGenerate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim()) return;

    setLoading(true);
    setDisplayText(input);
    setShowSettings(false); // Auto close settings on generate
    
    try {
      const newConfig = await generateArtConfig(input);
      setConfig(newConfig);
    } catch (error) {
      console.error("Failed to generate art config", error);
    } finally {
      setLoading(false);
    }
  };

  const handleManualChange = (key: keyof ArtConfig, value: number) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  const downloadImage = () => {
    if (!canvasRef) return;
    const link = document.createElement('a');
    link.download = `moodflow-${displayText.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.png`;
    link.href = canvasRef.toDataURL('image/png');
    link.click();
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && document.activeElement?.tagName !== 'INPUT') {
        e.preventDefault();
        setHideUI(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="relative w-full h-screen bg-white overflow-hidden font-sans text-black">
      {/* Background Canvas */}
      <FluidCanvas 
        config={config} 
        text={displayText} 
        setCanvasRef={setCanvasRef} 
      />

      {/* Main UI Overlay */}
      <div 
        className={`absolute inset-0 flex flex-col justify-end pb-12 px-4 transition-opacity duration-500 pointer-events-none ${hideUI ? 'opacity-0' : 'opacity-100'}`}
      >
        <div className="max-w-xl mx-auto w-full pointer-events-auto flex flex-col items-center space-y-4">
          
          {/* Settings Panel (Popover) */}
          {showSettings && (
            <div className="w-full bg-white/95 backdrop-blur-xl border border-black/10 p-6 rounded-2xl shadow-2xl mb-2 animate-slide-up origin-bottom">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-bold uppercase tracking-widest text-black/80">Adjust Variables</h3>
                <button onClick={() => setShowSettings(false)} className="text-black/40 hover:text-black">
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>
              
              <div className="space-y-6">
                {/* Direction Slider */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-semibold text-black/60">
                    <span>DIRECTION</span>
                    <span>{Math.round(config.flowAngle)}°</span>
                  </div>
                  <input 
                    type="range" 
                    min="0" 
                    max="360" 
                    value={config.flowAngle} 
                    onChange={(e) => handleManualChange('flowAngle', parseFloat(e.target.value))}
                    className="w-full h-2 bg-black/10 rounded-lg appearance-none cursor-pointer accent-black"
                  />
                  <div className="flex justify-between text-[10px] text-black/30 font-mono">
                    <span>RIGHT</span>
                    <span>DOWN</span>
                    <span>LEFT</span>
                    <span>UP</span>
                    <span>RIGHT</span>
                  </div>
                </div>

                {/* Speed Slider */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-semibold text-black/60">
                    <span>SPEED</span>
                    <span>{config.speed.toFixed(1)}</span>
                  </div>
                  <input 
                    type="range" 
                    min="0.5" 
                    max="5.0" 
                    step="0.1"
                    value={config.speed} 
                    onChange={(e) => handleManualChange('speed', parseFloat(e.target.value))}
                    className="w-full h-2 bg-black/10 rounded-lg appearance-none cursor-pointer accent-black"
                  />
                </div>

                {/* Chaos Slider */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-semibold text-black/60">
                    <span>CHAOS</span>
                    <span>{Math.round(config.chaos * 1000)}</span>
                  </div>
                  <input 
                    type="range" 
                    min="0.001" 
                    max="0.01" 
                    step="0.001"
                    value={config.chaos} 
                    onChange={(e) => handleManualChange('chaos', parseFloat(e.target.value))}
                    className="w-full h-2 bg-black/10 rounded-lg appearance-none cursor-pointer accent-black"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Mood Badge */}
          {config.moodDescription && !showSettings && (
            <span className="bg-white/80 backdrop-blur-md border border-black/10 text-xs uppercase tracking-widest text-black/80 px-4 py-1.5 rounded-full shadow-sm animate-fade-in font-bold">
              {config.moodDescription}
            </span>
          )}

          {/* Controls Container */}
          <div className="bg-white/90 backdrop-blur-xl border border-black/10 p-2 rounded-2xl shadow-xl flex items-center gap-2 w-full">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className={`p-3 rounded-xl flex items-center gap-2 transition-all ${
                showSettings 
                  ? 'bg-black text-white shadow-lg' 
                  : 'text-black/70 hover:text-black hover:bg-black/5'
              }`}
              title="Settings"
            >
              <AdjustmentsHorizontalIcon className="w-5 h-5" />
            </button>

            <div className="w-px h-8 bg-black/10 mx-1"></div>

            <form onSubmit={handleGenerate} className="flex-1 flex items-center gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Enter text..."
                maxLength={20}
                className="w-full bg-transparent text-black placeholder-black/40 px-4 py-3 outline-none rounded-xl hover:bg-black/5 focus:bg-black/5 transition-colors uppercase tracking-wider font-extrabold text-lg"
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className={`p-3 rounded-xl flex items-center gap-2 transition-all ${
                  loading 
                    ? 'bg-black/10 cursor-not-allowed' 
                    : 'bg-black hover:bg-gray-800 text-white shadow-lg shadow-black/20'
                }`}
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <SparklesIcon className="w-5 h-5" />
                )}
              </button>
            </form>

            <div className="w-px h-8 bg-black/10 mx-1"></div>

            <button
              onClick={downloadImage}
              className="p-3 text-black/70 hover:text-black hover:bg-black/5 rounded-xl transition-colors"
              title="Download Image"
            >
              <ArrowDownTrayIcon className="w-5 h-5" />
            </button>
          </div>
          
          <div className="text-center text-black/40 text-xs font-medium">
            Press <span className="font-bold text-black/60">Space</span> to toggle UI
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;