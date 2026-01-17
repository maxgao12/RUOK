import Meyda from "meyda";

/**
 * AudioFeatureResult represents the extracted signals from a 20s check-in.
 */
export interface AudioFeatures {
    rms: number;         // Energy Level (Loudness)
    zcr: number;         // Zero Crossing Rate (Texure/Frequency variability)
    pauseRatio: number;  // (Time < threshold) / Total Time
    speechRate: number;  // Envelopes peaks / Duration (Rough approx for MVP)
    duration: number;    // In seconds
}

export class Audioanalyzer {
    private audioContext: AudioContext | null = null;
    private source: MediaStreamAudioSourceNode | null = null;
    private analyzer: Meyda.MeydaAnalyzer | null = null;
    private stream: MediaStream | null = null;

    // buffers for accumulating data
    private energyHistory: number[] = [];
    private zcrHistory: number[] = [];
    private isRecording = false;

    async start(): Promise<void> {
        if (this.isRecording) return;

        this.stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        this.source = this.audioContext.createMediaStreamSource(this.stream);

        // Setup Meyda
        this.energyHistory = [];
        this.zcrHistory = [];

        this.analyzer = Meyda.createMeydaAnalyzer({
            audioContext: this.audioContext,
            source: this.source,
            bufferSize: 512,
            featureExtractors: ["rms", "zcr", "spectralCentroid"],
            callback: (features: any) => {
                if (features && this.isRecording) {
                    this.energyHistory.push(features.rms);
                    this.zcrHistory.push(features.zcr);
                    // this.centroidHistory.push(features.spectralCentroid); (TODO: Add buffering if needed)
                }
            },
        });

        this.isRecording = true;
        this.analyzer.start();
    }

    async stop(): Promise<AudioFeatures> {
        if (!this.isRecording) throw new Error("Not recording");

        this.isRecording = false;
        if (this.analyzer) this.analyzer.stop();

        // Stop tracks
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
        }

        if (this.audioContext) {
            await this.audioContext.suspend();
            await this.audioContext.close();
        }

        return this.processFeatures();
    }

    private processFeatures(): AudioFeatures {
        if (this.energyHistory.length === 0) {
            return { rms: 0, zcr: 0, pauseRatio: 0, speechRate: 0, duration: 0 };
        }

        // 1. Average Energy (RMS)
        const avgEnergy = this.energyHistory.reduce((a, b) => a + b, 0) / this.energyHistory.length;

        // 2. Pause Ratio (Silence Detection)
        const maxEnergy = Math.max(...this.energyHistory);
        const silenceThreshold = Math.max(0.02, maxEnergy * 0.1);
        const silenceFrames = this.energyHistory.filter(e => e < silenceThreshold).length;
        const pauseRatio = silenceFrames / this.energyHistory.length;

        // 3. Zero Crossing Rate (Avg)
        const avgZcr = this.zcrHistory.reduce((a, b) => a + b, 0) / this.zcrHistory.length;

        // 4. Speech Rate (Mock/Heuristic for MVP)
        let bursts = 0;
        let inBurst = false;
        for (const e of this.energyHistory) {
            if (!inBurst && e > silenceThreshold) {
                bursts++;
                inBurst = true;
            } else if (inBurst && e < silenceThreshold) {
                inBurst = false;
            }
        }

        const duration = this.energyHistory.length * (512 / 44100);
        const speechRate = duration > 0 ? (bursts / duration) : 0;

        // 5. Strain/Roughness Proxy (Mocked for MVP as we didn't store spectral buffers)
        // In a real implementation we would average the spectralCentroid history.
        // For Hackathon "Less BS" -> we use ZCR variance as a proxy for roughness if not available.
        // But let's assume we update the analyzer to capture it.
        const roughness = avgZcr * 10; // Simple scaling for now

        return {
            rms: avgEnergy,
            zcr: avgZcr,
            pauseRatio,
            speechRate,
            duration
        };
    }
}
