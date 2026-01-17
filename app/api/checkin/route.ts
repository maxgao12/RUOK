import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { nanoid } from "nanoid";

// Polyfill nanoid if needed or just use random string
const genId = () => Math.random().toString(36).substring(7);

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { features, selfReport } = body;

        const record = {
            id: genId(),
            timestamp: new Date().toISOString(),
            features,
            selfReport
        };

        db.addCheckIn(record);

        // Detect Trends & Calculate AI Risk Scores
        const baseline = db.getBaseline();
        const flags = [];

        // --- AI Scoring Engine ---

        // Helper: Calculate pseudo-Z-Score (Drift Factor)
        const getDrift = (val: number, base: number) => {
            if (base === 0) return 0;
            return (val - base) / (base * 0.1);
        };

        const eDrift = getDrift(features.rms, baseline.avgEnergy);

        // Helper: Sigmoid function to map drift to 0-100% probability
        // Steepness=1, Shift=2 means at rawScore=2 we consistently hit 50%
        const toProb = (x: number, steepness = 1.2, shift = 1.5) => {
            return 1 / (1 + Math.exp(-steepness * (x - shift)));
        };

        // 1. Lethargy Score (Probability)
        const lethargyRisk = (() => {
            const energyFactor = features.rms < baseline.avgEnergy ? Math.abs(eDrift) : 0;
            // Increased weight for speech rate
            const speechFactor = features.speechRate < 3.5 ? (3.5 - features.speechRate) * 3 : 0;
            const rawScore = (energyFactor * 0.5) + (speechFactor * 0.5);
            return Math.min(100, Math.round(toProb(rawScore, 1.2, 1.5) * 100)); // Shift lower to 1.5
        })();

        if (lethargyRisk > 40) { // Lower display threshold
            flags.push({
                type: "LETHARGY_PATTERN",
                msg: `Probability: ${lethargyRisk}%. Detected low energy and lethargic speech patterns.`,
                score: lethargyRisk
            });
        }

        // 2. Anxiety Score
        const anxietyRisk = (() => {
            // Stronger weight on self-report for responsiveness
            const stressFactor = selfReport.stress > 5 ? (selfReport.stress - 5) * 0.8 : 0;
            const speechFactor = features.speechRate > 4.5 ? (features.speechRate - 4.5) * 4 : 0;
            const jitterFactor = features.zcr > 0.1 ? (features.zcr - 0.1) * 30 : 0;

            // If stress is 9, stressFactor is 3.2 -> already triggers >50% prob alone.
            const rawScore = (stressFactor * 0.5) + (speechFactor * 0.3) + (jitterFactor * 0.2);
            return Math.min(100, Math.round(toProb(rawScore, 1, 2) * 100));
        })();

        if (anxietyRisk > 40) {
            flags.push({
                type: "ANXIETY_PATTERN",
                msg: `Probability: ${anxietyRisk}%. High anxiety markers detected.`,
                score: anxietyRisk
            });
        }

        // 3. Respiratory Strain Score
        const respRisk = (() => {
            const pauseFactor = features.pauseRatio > 0.3 ? (features.pauseRatio - 0.3) * 15 : 0;
            const phraseFactor = features.speechRate < 3.0 ? (3.0 - features.speechRate) * 1.5 : 0;
            const rawScore = (pauseFactor * 0.7) + (phraseFactor * 0.3);
            return Math.min(100, Math.round(toProb(rawScore, 1.2, 1) * 100));
        })();

        if (respRisk > 40) {
            flags.push({
                type: "RESPIRATORY_STRAIN",
                msg: `Probability: ${respRisk}%. Respiratory strain signatures detected.`,
                score: respRisk
            });
        }

        // 4. Vocal Strain Score
        const vocalRisk = (() => {
            const roughFactor = features.zcr > 0.15 ? (features.zcr - 0.15) * 15 : 0;
            const loudFactor = features.rms > 0.2 ? (features.rms - 0.2) * 5 : 0;
            const rawScore = (roughFactor * 0.8) + (loudFactor * 0.2);
            return Math.min(100, Math.round(toProb(rawScore, 2, 0.5) * 100)); // Very easy to trigger
        })();

        if (vocalRisk > 40) {
            flags.push({
                type: "VOCAL_STRAIN",
                msg: `Probability: ${vocalRisk}%. Vocal roughness/strain detected.`,
                score: vocalRisk
            });
        }

        return NextResponse.json({ success: true, processed: record, flags });
    } catch (e) {
        return NextResponse.json({ success: false, error: "Failed to save" }, { status: 500 });
    }
}
