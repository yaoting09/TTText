import React, { useRef, useEffect } from 'react';
import { ArtConfig, Particle } from '../types';

// Fast noise function for the flow field
const createNoise3D = () => {
  const p = new Uint8Array(512);
  const permutation = [151,160,137,91,90,15,131,13,201,95,96,53,194,233,7,225,140,36,103,30,69,142,8,99,37,240,21,10,23,190,6,148,247,120,234,75,0,26,197,62,94,252,219,203,117,35,11,32,57,177,33,88,237,149,56,87,174,20,125,136,171,168,68,175,74,165,71,134,139,48,27,166,77,146,158,231,83,111,229,122,60,211,133,230,220,105,92,41,55,46,245,40,244,102,143,54,65,25,63,161,1,216,80,73,209,76,132,187,208,89,18,169,200,196,135,130,116,188,159,86,164,100,109,198,173,186,3,64,52,217,226,250,124,123,5,202,38,147,118,126,255,82,85,212,207,206,59,227,47,16,58,17,182,189,28,42,223,183,170,213,119,248,152,2,44,154,163,70,221,153,101,155,167,43,172,9,129,22,39,253,19,98,108,110,79,113,224,232,178,185,112,104,218,246,97,228,251,34,242,193,238,210,144,12,191,179,162,241,81,51,145,235,249,14,239,107,49,192,214,31,181,199,106,157,184,84,204,176,115,121,50,45,127,4,150,254,138,236,205,93,222,114,67,29,24,72,243,141,128,195,78,66,215,61,156,180];
  for (let i=0; i < 256 ; i++) p[256+i] = p[i] = permutation[i];
  const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
  const lerp = (t: number, a: number, b: number) => a + t * (b - a);
  const grad = (hash: number, x: number, y: number, z: number) => {
      const h = hash & 15;
      const u = h<8 ? x : y, v = h<4 ? y : h===12||h===14 ? x : z;
      return ((h&1) === 0 ? u : -u) + ((h&2) === 0 ? v : -v);
  };
  return (x: number, y: number, z: number) => {
      const X = Math.floor(x) & 255, Y = Math.floor(y) & 255, Z = Math.floor(z) & 255;
      x -= Math.floor(x); y -= Math.floor(y); z -= Math.floor(z);
      const u = fade(x), v = fade(y), w = fade(z);
      const A = p[X]+Y, AA = p[A]+Z, AB = p[A+1]+Z, B = p[X+1]+Y, BA = p[B]+Z, BB = p[B+1]+Z;
      return lerp(w, lerp(v, lerp(u, grad(p[AA], x, y, z), grad(p[BA], x-1, y, z)), lerp(u, grad(p[AB], x, y-1, z), grad(p[BB], x-1, y-1, z))), lerp(v, lerp(u, grad(p[AA+1], x, y, z-1), grad(p[BA+1], x-1, y, z-1)), lerp(u, grad(p[AB+1], x, y-1, z-1), grad(p[BB+1], x-1, y-1, z-1))));
  };
};

const noise = createNoise3D();

interface FluidCanvasProps {
  config: ArtConfig;
  text: string;
  setCanvasRef: (ref: HTMLCanvasElement | null) => void;
}

interface Point {
  x: number;
  y: number;
}

const FluidCanvas: React.FC<FluidCanvasProps> = ({ config, text, setCanvasRef }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const particlesRef = useRef<Particle[]>([]);
  const spawnPointsRef = useRef<Point[]>([]);
  const timeRef = useRef<number>(0);

  useEffect(() => {
    if (canvasRef.current) {
      setCanvasRef(canvasRef.current);
    }
  }, [setCanvasRef]);

  // Scan text to find valid spawn points (pixels that are part of the text)
  const scanText = (width: number, height: number, angle: number) => {
    const offCanvas = document.createElement('canvas');
    offCanvas.width = width;
    offCanvas.height = height;
    const offCtx = offCanvas.getContext('2d');
    if (!offCtx) return;

    const fontSize = Math.min(width / 4, 300); // Larger, bold font
    
    offCtx.fillStyle = '#000000'; 
    offCtx.font = `900 ${fontSize}px "Helvetica Neue", Arial, sans-serif`; 
    offCtx.textAlign = 'center';
    offCtx.textBaseline = 'middle';
    
    // Dynamic Positioning: 
    // If flow is to the Right (0deg), place text Left.
    // If flow is Down (90deg), place text Top.
    // We calculate offset opposite to the flow vector.
    const rad = angle * (Math.PI / 180);
    const offsetX = -Math.cos(rad) * (width * 0.15);
    const offsetY = -Math.sin(rad) * (height * 0.15);

    const centerX = width / 2 + offsetX;
    const centerY = height / 2 + offsetY;

    offCtx.fillText(text.toUpperCase(), centerX, centerY);

    const imageData = offCtx.getImageData(0, 0, width, height);
    const data = imageData.data;
    const points: Point[] = [];
    
    // Sample density
    const step = 2; 
    
    for (let y = 0; y < height; y += step) {
      for (let x = 0; x < width; x += step) {
        if (data[(y * width + x) * 4 + 3] > 128) {
          points.push({ x, y });
        }
      }
    }
    spawnPointsRef.current = points;
    particlesRef.current = []; // Clear old particles on text change
  };

  const spawnParticle = (): Particle | null => {
    if (spawnPointsRef.current.length === 0) return null;
    
    const index = Math.floor(Math.random() * spawnPointsRef.current.length);
    const point = spawnPointsRef.current[index];
    
    return {
      x: point.x,
      y: point.y,
      vx: 0,
      vy: 0,
      color: Math.random() > 0.5 ? '#000000' : '#1a1a1a', 
      size: Math.random() * 1.5 + 0.5,
    };
  };

  // Re-scan text whenever dimensions, text, or flow direction changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      scanText(canvas.width, canvas.height, config.flowAngle);
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
    };

    window.addEventListener('resize', resize);
    resize();

    return () => window.removeEventListener('resize', resize);
  }, [text, config.flowAngle]);

  // Animation Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const animate = () => {
      // Trail fade effect
      ctx.fillStyle = `rgba(255, 255, 255, ${config.blurLevel})`; 
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      timeRef.current += config.speed * 0.005;

      const maxParticles = config.particleCount * 4; 
      const spawnRate = Math.floor(config.particleCount / 10); 

      // Spawn new particles
      for (let i = 0; i < spawnRate; i++) {
        const p = spawnParticle();
        if (p) particlesRef.current.push(p);
      }

      // Cap particle count
      if (particlesRef.current.length > maxParticles) {
         particlesRef.current.splice(0, particlesRef.current.length - maxParticles);
      }

      // Physics Constants
      const flowRad = config.flowAngle * (Math.PI / 180);
      const baseFlowX = Math.cos(flowRad) * config.speed * 2;
      const baseFlowY = Math.sin(flowRad) * config.speed * 2;
      
      // We calculate a vector perpendicular to flow for the "wave" distortion
      // If flow is (1,0) [Right], perp is (0, 1) [Down/Up]
      // If flow is (0,1) [Down], perp is (-1, 0) [Left/Right]
      const perpX = -Math.sin(flowRad);
      const perpY = Math.cos(flowRad);

      const waveScale = 0.002 * config.chaos * 1000;

      ctx.beginPath();
      
      for (let i = 0; i < particlesRef.current.length; i++) {
        const p = particlesRef.current[i];
        
        // 3D Noise for organic movement
        const noiseVal = noise(p.x * waveScale, p.y * waveScale, timeRef.current);
        
        // Apply wave distortion perpendicular to the main flow
        const waveStrength = 0.5; // Multiplier for how wide the wave is
        p.vx += perpX * noiseVal * waveStrength;
        p.vy += perpY * noiseVal * waveStrength;

        // Apply constant flow
        // We add absolute velocity to position? 
        // No, we add velocity to position.
        // We want particles to accelerate in flow direction
        p.vx += baseFlowX * 0.05; // Acceleration factor
        p.vy += baseFlowY * 0.05;

        // Damping (optional, creates terminal velocity)
        p.vx *= 0.95;
        p.vy *= 0.95;

        // Move
        p.x += p.vx + baseFlowX; // Add base flow directly for consistent speed
        p.y += p.vy + baseFlowY;

        ctx.moveTo(p.x, p.y);
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      }
      
      ctx.fillStyle = '#000000';
      ctx.fill();

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [config]);

  return (
    <canvas 
      ref={canvasRef} 
      className="absolute top-0 left-0 w-full h-full block z-0 cursor-crosshair"
      style={{ background: '#FFFFFF' }}
    />
  );
};

export default FluidCanvas;