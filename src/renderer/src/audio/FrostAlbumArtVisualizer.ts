import type { AudioSpectrumSample, AlbumArtVisualizerState, VisualizerMode } from '../../../shared/types';

export interface AlbumArtVisualizerOptions {
  canvas: HTMLCanvasElement;
  artElement?: HTMLImageElement | HTMLDivElement | null;
  reducedMotion?: boolean;
  demoMode?: boolean;
  baseRadius?: number;
  activeRotationSpeed?: number;
  minAmplitude?: number;
}

export class FrostAlbumArtVisualizer {
  private readonly canvas: HTMLCanvasElement;
  private readonly artElement?: HTMLImageElement | HTMLDivElement | null;
  private readonly reducedMotion: boolean;
  private readonly demoMode: boolean;
  private readonly minAmplitude: number;
  private readonly baseRadius: number;
  private readonly activeRotationSpeed: number;
  private readonly context: CanvasRenderingContext2D;
  private animationFrameId: number | null = null;
  private analyserNode: AnalyserNode | null = null;
  private isVisible = true;
  private isPlaying = false;
  private visibilityHandler: (() => void) | null = null;
  private amplitude = 0;
  private currentRotation = 0;
  private lastTimestamp = 0;
  private activeMode: VisualizerMode = 'idle';
  private readonly state: AlbumArtVisualizerState = {
    enabled: true,
    visible: true,
    rotationVelocity: 0,
    amplitude: 0,
    mode: 'idle',
    reducedMotion: false,
    isPlaying: false
  };

  constructor(options: AlbumArtVisualizerOptions) {
    this.canvas = options.canvas;
    this.artElement = options.artElement ?? null;
    this.reducedMotion = options.reducedMotion ?? this.prefersReducedMotion();
    this.demoMode = options.demoMode ?? false;
    this.minAmplitude = options.minAmplitude ?? 0.08;
    this.baseRadius = options.baseRadius ?? 110;
    this.activeRotationSpeed = options.activeRotationSpeed ?? 0.12;
    const context = this.canvas.getContext('2d');
    if (!context) {
      throw new Error('Canvas 2D context is not available.');
    }
    this.context = context;
    this.state.reducedMotion = this.reducedMotion;
    this.installVisibilityListener();
    this.applyCanvasSize();
    this.renderIdleFrame();
  }

  public attachAnalyser(analyserNode: AnalyserNode | null): void {
    this.analyserNode = analyserNode;
    if (!this.analyserNode && this.demoMode) {
      this.activeMode = 'demo';
      this.state.mode = 'demo';
    }
  }

  public setVisible(visible: boolean): void {
    this.isVisible = visible;
    this.state.visible = visible;

    if (visible) {
      this.resume();
      return;
    }

    this.pause();
  }

  public setPlaying(isPlaying: boolean): void {
    this.isPlaying = isPlaying;
    this.state.isPlaying = isPlaying;
    this.state.mode = this.analyserNode ? 'real' : (this.demoMode ? 'demo' : 'idle');
    this.activeMode = this.state.mode;
  }

  public updateRotationForPlayback(enabled: boolean): void {
    if (this.reducedMotion) {
      this.state.rotationVelocity = 0;
      if (this.artElement) {
        this.artElement.style.transform = 'rotate(0deg)';
      }
      return;
    }

    this.state.rotationVelocity = enabled ? this.activeRotationSpeed : 0;
    if (!enabled) {
      this.currentRotation = this.currentRotation % (Math.PI * 2);
    }
  }

  public start(): void {
    if (this.reducedMotion) {
      this.state.enabled = false;
      return;
    }

    if (this.animationFrameId !== null) {
      return;
    }

    this.state.enabled = true;
    this.resume();
  }

  public pause(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  public resume(): void {
    if (!this.isVisible || this.reducedMotion) {
      return;
    }

    if (this.animationFrameId !== null) {
      return;
    }

    this.animationFrameId = requestAnimationFrame((timestamp) => this.renderFrame(timestamp));
  }

  public resize(): void {
    this.applyCanvasSize();
  }

  public dispose(): void {
    this.pause();
    if (this.visibilityHandler && typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.visibilityHandler);
    }
    this.visibilityHandler = null;
  }

  public getState(): AlbumArtVisualizerState {
    return { ...this.state, amplitude: this.amplitude, mode: this.activeMode };
  }

  public getSpectrum(): AudioSpectrumSample {
    const analyser = this.analyserNode;
    const data = analyser ? new Uint8Array(analyser.frequencyBinCount) : null;
    if (!analyser || !data) {
      return {
        frequencyBinCount: 0,
        average: 0,
        peak: 0,
        low: 0,
        mid: 0,
        high: 0,
        normalized: 0
      };
    }

    analyser.getByteFrequencyData(data);
    const average = data.reduce((sum, value) => sum + value, 0) / data.length;
    const peak = Math.max(...Array.from(data));
    const low = this.averageSlice(data, 0, 0.16);
    const mid = this.averageSlice(data, 0.16, 0.55);
    const high = this.averageSlice(data, 0.55, 1);
    const normalized = Math.min(1, average / 255);

    return {
      frequencyBinCount: data.length,
      average,
      peak,
      low,
      mid,
      high,
      normalized
    };
  }

  private renderFrame(timestamp: number): void {
    if (!this.isVisible) {
      this.animationFrameId = null;
      return;
    }

    const delta = this.lastTimestamp ? Math.min(40, timestamp - this.lastTimestamp) : 16;
    this.lastTimestamp = timestamp;

    this.updateVisualState(delta);
    this.drawRing();
    this.animationFrameId = requestAnimationFrame((nextTimestamp) => this.renderFrame(nextTimestamp));
  }

  private updateVisualState(delta: number): void {
    const spectrum = this.getSpectrum();
    const signalStrength = this.analyserNode ? spectrum.normalized : (this.demoMode ? 0.28 + (Math.sin(Date.now() / 350) + 1) * 0.18 : 0);
    this.amplitude = Math.max(this.minAmplitude, signalStrength);

    if (this.analyserNode && this.isPlaying) {
      this.activeMode = 'real';
      this.state.mode = 'real';
      this.currentRotation += (this.state.rotationVelocity || 0) * delta * (0.35 + this.amplitude * 0.9);
    } else if (this.demoMode) {
      this.activeMode = 'demo';
      this.state.mode = 'demo';
      this.currentRotation += 0.08 * delta * 0.6;
    } else {
      this.activeMode = 'idle';
      this.state.mode = 'idle';
      this.currentRotation += 0.02 * delta;
    }

    this.state.amplitude = this.amplitude;

    if (this.artElement) {
      this.artElement.style.transform = `rotate(${this.currentRotation * 12}deg)`;
    }
  }

  private drawRing(): void {
    const width = this.canvas.width;
    const height = this.canvas.height;
    const cx = width / 2;
    const cy = height / 2;
    const radius = this.baseRadius + this.amplitude * 40;

    this.context.clearRect(0, 0, width, height);

    const gradient = this.context.createRadialGradient(cx, cy, 20, cx, cy, radius + 30);
    gradient.addColorStop(0, 'rgba(255,255,255,0.22)');
    gradient.addColorStop(0.22, 'rgba(110,210,255,0.14)');
    gradient.addColorStop(1, 'rgba(8,13,21,0.04)');
    this.context.fillStyle = gradient;
    this.context.fillRect(0, 0, width, height);

    this.context.beginPath();
    this.context.lineWidth = 4;
    this.context.strokeStyle = `rgba(122, 215, 255, ${0.65 + this.amplitude})`;
    this.context.arc(cx, cy, radius, 0, Math.PI * 2);
    this.context.stroke();

    for (let index = 0; index < 22; index += 1) {
      const angle = (Math.PI * 2 * index) / 22 + this.currentRotation;
      const inner = radius - 8;
      const outer = radius + 12 + this.amplitude * 20;
      const x1 = cx + Math.cos(angle) * inner;
      const y1 = cy + Math.sin(angle) * inner;
      const x2 = cx + Math.cos(angle) * outer;
      const y2 = cy + Math.sin(angle) * outer;

      this.context.beginPath();
      this.context.strokeStyle = `rgba(167, 224, 255, ${0.22 + (index / 22) * 0.42})`;
      this.context.lineWidth = 2;
      this.context.moveTo(x1, y1);
      this.context.lineTo(x2, y2);
      this.context.stroke();
    }

    if (this.analyserNode || this.demoMode) {
      this.context.beginPath();
      this.context.lineWidth = 2;
      this.context.strokeStyle = 'rgba(255,255,255,0.45)';
      this.context.arc(cx, cy, radius - 16, Math.PI * -0.5, Math.PI * (this.amplitude * 1.7) - Math.PI * 0.5);
      this.context.stroke();
    }
  }

  private renderIdleFrame(): void {
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.context.beginPath();
    this.context.strokeStyle = 'rgba(160, 180, 245, 0.32)';
    this.context.lineWidth = 2;
    this.context.arc(this.canvas.width / 2, this.canvas.height / 2, this.baseRadius, 0, Math.PI * 2);
    this.context.stroke();
  }

  private applyCanvasSize(): void {
    const ratio = window.devicePixelRatio || 1;
    const width = this.canvas.clientWidth || 280;
    const height = this.canvas.clientHeight || 280;
    this.canvas.width = Math.max(1, Math.floor(width * ratio));
    this.canvas.height = Math.max(1, Math.floor(height * ratio));
    this.context.setTransform(ratio, 0, 0, ratio, 0, 0);
  }

  private averageSlice(data: Uint8Array, fromRatio: number, toRatio: number): number {
    const start = Math.floor(data.length * fromRatio);
    const end = Math.min(data.length, Math.ceil(data.length * toRatio));
    if (start >= end) {
      return 0;
    }

    let total = 0;
    for (let i = start; i < end; i += 1) {
      total += data[i];
    }

    return total / (end - start || 1);
  }

  private prefersReducedMotion(): boolean {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return false;
    }

    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  private installVisibilityListener(): void {
    if (typeof document === 'undefined') {
      return;
    }

    this.visibilityHandler = () => {
      if (document.visibilityState === 'hidden') {
        this.pause();
        this.isVisible = false;
        return;
      }

      this.isVisible = true;
      if (this.isPlaying || this.demoMode) {
        this.resume();
      }
    };

    document.addEventListener('visibilitychange', this.visibilityHandler);
  }
}
