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

        // Detect Trends immediately
        const baseline = db.getBaseline();
        const flags = [];

        // 1. Lethargy Pattern (Simple Depression Correlate)
        // Low Energy + Slow Speech
        if (features.rms < baseline.avgEnergy * 0.7 && features.speechRate < 3.0) {
            flags.push({
                type: "LETHARGY_PATTERN",
                msg: "Detected low energy and slower speech rate (Lethargy Pattern)."
            });
        }

        // 2. Anxiety Pattern
        // High Stress (Self Report) + Fast Speech + High Energy
        if (selfReport.stress >= 7 && features.speechRate > 4.5) {
            flags.push({
                type: "ANXIETY_PATTERN",
                msg: "High stress reported coincident with rapid speech (Anxiety Pattern)."
            });
        }

        // 3. Respiratory Strain / Breathlessness
        // High Pause Ratio (> 40%) but normal energy (struggling to speak continuous phrases)
        if (features.pauseRatio > 0.4 && features.rms > 0.1) {
            flags.push({
                type: "RESPIRATORY_STRAIN",
                msg: "Frequent pausing detected (Potential Respiratory Strain)."
            });
        }

        // 4. Vocal Strain / Roughness
        // High ZCR (Roughness proxy) + High Energy
        // ZCR > 0.3 implies "noisy" signal often correlated with hoarseness or strain
        if (features.zcr > 0.15 && features.rms > 0.2) {
            flags.push({
                type: "VOCAL_STRAIN",
                msg: "Detected high signal roughness (Potential Vocal Strain/Hoarseness)."
            });
        }

        // 5. Monotone (Depression/Fatigue Marker)
        // Very low RMS variance would be better, but we only have avg RMS
        // Proxy: Very low speech rate + low ZCR (lack of intonation usually drops ZCR avg)
        if (features.speechRate < 2.0 && features.zcr < 0.05) {
            flags.push({
                type: "MONOTONE_FLAT",
                msg: "Detected flat affect/monotone speech patterns."
            });
        }

        // Baseline Drift Generic
        if (features.rms < baseline.avgEnergy * 0.6) {
            flags.push({ type: "LOW_ENERGY", msg: "Energy significantly below baseline." });
        }

        return NextResponse.json({ success: true, processed: record, flags });
    } catch (e) {
        return NextResponse.json({ success: false, error: "Failed to save" }, { status: 500 });
    }
}
