class AudioEngine {
  private ctx: AudioContext | null = null;
  private noiseNode: AudioBufferSourceNode | null = null;
  private gainNode: GainNode | null = null;

  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }

  playChime() {
    this.init();
    if (!this.ctx) return;
    
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    // Play a nice two-tone chime
    osc.frequency.setValueAtTime(523.25, t); // C5
    osc.frequency.setValueAtTime(659.25, t + 0.15); // E5

    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.5, t + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 2);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc.start(t);
    osc.stop(t + 2);
  }

  private createBrownNoise() {
    if (!this.ctx) return null;
    const bufferSize = 2 * this.ctx.sampleRate;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    let lastOut = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      output[i] = (lastOut + (0.02 * white)) / 1.02;
      lastOut = output[i];
      output[i] *= 3.5; // (roughly) compensate for gain
    }
    return noiseBuffer;
  }

  playBackgroundNoise(volume: number = 0.5) {
    this.init();
    if (!this.ctx) return;
    
    this.stopBackgroundNoise();

    const buffer = this.createBrownNoise();
    if (!buffer) return;

    this.noiseNode = this.ctx.createBufferSource();
    this.noiseNode.buffer = buffer;
    this.noiseNode.loop = true;

    this.gainNode = this.ctx.createGain();
    this.gainNode.gain.value = volume;

    // Gentle fade in
    this.gainNode.gain.setValueAtTime(0, this.ctx.currentTime);
    this.gainNode.gain.linearRampToValueAtTime(volume, this.ctx.currentTime + 2);

    // Apply a low-pass filter to make it sound like rain/wind
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 400;

    this.noiseNode.connect(filter);
    filter.connect(this.gainNode);
    this.gainNode.connect(this.ctx.destination);

    this.noiseNode.start();
  }

  setVolume(volume: number) {
    if (this.gainNode && this.ctx) {
      this.gainNode.gain.linearRampToValueAtTime(volume, this.ctx.currentTime + 0.5);
    }
  }

  stopBackgroundNoise() {
    if (this.noiseNode && this.ctx && this.gainNode) {
      // Fade out
      this.gainNode.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 1);
      setTimeout(() => {
        if (this.noiseNode) {
          this.noiseNode.stop();
          this.noiseNode.disconnect();
          this.noiseNode = null;
        }
      }, 1000);
    }
  }
}

export const audio = new AudioEngine();
