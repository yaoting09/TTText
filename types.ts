export interface ArtConfig {
  colors: string[];
  speed: number;
  chaos: number;
  blurLevel: number; // 0.01 (long trails) to 0.5 (short trails)
  particleCount: number;
  moodDescription?: string;
  flowAngle: number; // 0 to 360 degrees
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
}