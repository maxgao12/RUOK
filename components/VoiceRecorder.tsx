"use client";

import React, { useState, useEffect, useRef } from "react";
import { Mic, Square, CheckCircle, Loader2 } from "lucide-react";
import { Audioanalyzer, AudioFeatures } from "../lib/audioUtils";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface VoiceRecorderProps {
    onComplete: (data: { features: AudioFeatures; selfReport: { stress: number; fatigue: number } }) => void;
}

export default function VoiceRecorder({ onComplete }: VoiceRecorderProps) {
    const [step, setStep] = useState<"IDLE" | "RECORDING" | "REPORT" | "DONE">("IDLE");
    const [timeLeft, setTimeLeft] = useState(20);
    const [features, setFeatures] = useState<AudioFeatures | null>(null);

    // Ref for Analyzer
    const analyzerRef = useRef<Audioanalyzer | null>(null);

    // Self Report State
    const [stress, setStress] = useState(5);
    const [fatigue, setFatigue] = useState(5);

    const PROMPTS = [
        "When the sunlight strikes raindrops in the air, they act like a prism and form a rainbow. The rainbow is a division of white light into many beautiful colors. These take the shape of a long round arch, with its path high above, and its two ends apparently beyond the horizon.",
        "You wish to know all about my grandfather. Well, he is nearly ninety-three years old; he dresses himself in an ancient black frock coat, usually minus several buttons; yet he still thinks as swiftly as ever. A long, flowing beard clings to his chin, giving those who observe him a pronounced feeling of the utmost respect.",
        "There is a popularity that seeks him, and there is a popularity that he seeks. He is not always popular with others, but he is always popular with himself. He reads books, he listens to music, and he often walks alone in the forest, listening to the wind in the trees and the birds singing their songs.",
        "The north wind and the sun were disputing which was the stronger, when a traveler came along wrapped in a warm cloak. They agreed that the one who first succeeded in making the traveler take his cloak off should be considered stronger than the other. Then the north wind blew as hard as he could, but the more he blew the more closely the traveler folded his cloak around him."
    ];
    const [promptText, setPromptText] = useState("");

    useEffect(() => {
        setPromptText(PROMPTS[Math.floor(Math.random() * PROMPTS.length)]);
    }, []);



    useEffect(() => {
        return () => {
            // Cleanup
            if (analyzerRef.current) {
                analyzerRef.current.stop().catch(() => { });
            }
        };
    }, []);

    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (step === "RECORDING" && timeLeft > 0) {
            interval = setInterval(() => {
                setTimeLeft((prev) => prev - 1);
            }, 1000);
        } else if (step === "RECORDING" && timeLeft === 0) {
            stopRecording();
        }
        return () => clearInterval(interval);
    }, [step, timeLeft]);

    const startRecording = async () => {
        try {
            analyzerRef.current = new Audioanalyzer();
            await analyzerRef.current.start();
            setStep("RECORDING");
            setTimeLeft(20);
        } catch (e) {
            console.error("Failed to start recording:", e);
            alert("Microphone access denied or error occurred.");
        }
    };

    // Continuous, baseline-relative stress/fatigue estimation
    const inferMetrics = (feat: AudioFeatures, baseline?: {
        speechRateMean: number, speechRateStd: number,
        rmsMean: number, rmsStd: number,
        zcrMean: number, zcrStd: number,
        pauseMean: number, pauseStd: number
    }) => {

        // Fallback to hard-coded baseline if none provided
        const b = baseline || {
            speechRateMean: 4.0, speechRateStd: 0.5,
            rmsMean: 0.2, rmsStd: 0.05,
            zcrMean: 0.1, zcrStd: 0.05,
            pauseMean: 0.2, pauseStd: 0.05
        };

        // 1. Compute z-scores for all features
        const z_speechRate = (feat.speechRate - b.speechRateMean) / b.speechRateStd;
        const z_rms = (feat.rms - b.rmsMean) / b.rmsStd;
        const z_zcr = (feat.zcr - b.zcrMean) / b.zcrStd;
        const z_pause = (feat.pauseRatio - b.pauseMean) / b.pauseStd;

        // 2. Continuous weighted sums for stress/fatigue
        // Stress increases with faster speech, louder volume, higher ZCR, lower pauses
        const stress_raw = 0.4 * z_speechRate + 0.3 * z_rms + 0.2 * z_zcr - 0.1 * z_pause;

        // Fatigue increases with slower speech, lower volume, lower ZCR, higher pauses
        const fatigue_raw = -0.4 * z_speechRate - 0.3 * z_rms - 0.2 * z_zcr + 0.1 * z_pause;

        // 3. Normalize to 0–10 scale
        const normalize = (value: number, min = -3, max = 3) => {
            const clipped = Math.max(min, Math.min(max, value));
            return Math.round(((clipped - min) / (max - min)) * 10);
        };

        const stress = normalize(stress_raw);
        const fatigue = normalize(fatigue_raw);

        return { stress, fatigue };
    };

    const stopRecording = async () => {
        if (!analyzerRef.current) return;
        try {
            const result = await analyzerRef.current.stop();
            setFeatures(result);

            // Auto-analyze and submit
            setStep("REPORT"); // show analyzing

            // Infer metrics using continuous model
            const inferred = inferMetrics(result);
            setStress(inferred.stress);
            setFatigue(inferred.fatigue);

            setTimeout(() => {
                onComplete({
                    features: result,
                    selfReport: inferred,
                });
                setStep("DONE");
            }, 1500);

        } catch (e) {
            console.error("Error stopping:", e);
        }
    };

    // No longer need manual submit
    const submitCheckIn = () => { };

    return (
        <div className="w-full max-w-md mx-auto bg-card border border-border rounded-xl p-6 shadow-xl">
            {step === "IDLE" && (
                <div className="flex flex-col items-center justify-center space-y-6 py-8">
                    <h2 className="text-2xl font-semibold text-center">Ready to check in?</h2>
                    <p className="text-muted-foreground text-center">
                        Speak naturally for 20 seconds about your day.
                    </p>
                    <button
                        onClick={startRecording}
                        className="w-20 h-20 rounded-full bg-primary hover:bg-blue-600 transition-all flex items-center justify-center shadow-[0_0_20px_rgba(59,130,246,0.5)]"
                    >
                        <Mic className="text-white w-8 h-8" />
                    </button>
                    <p className="text-xs text-muted-foreground">AI will analyze your vitals automatically.</p>
                </div>
            )}


            {step === "RECORDING" && (
                <div className="flex flex-col items-center justify-center space-y-6 py-8">
                    <div className="w-full bg-muted/20 p-4 rounded-lg border border-muted text-center mb-4">
                        <p className="text-lg font-medium leading-relaxed">
                            "{promptText}"
                        </p>
                        <p className="text-xs text-muted-foreground mt-2 uppercase tracking-widest">Please read aloud</p>
                    </div>

                    <div className="relative w-24 h-24 flex items-center justify-center">
                        {/* Simple Ripple Animation */}
                        <div className="absolute inset-0 bg-red-500/20 rounded-full animate-ping"></div>
                        <div className="relative w-24 h-24 bg-red-500 rounded-full flex items-center justify-center">
                            <span className="text-2xl font-bold text-white">{timeLeft}</span>
                        </div>
                    </div>
                    <p className="text-muted-foreground animate-pulse">Listening...</p>
                    <button
                        onClick={stopRecording}
                        className="px-4 py-2 bg-muted rounded-full text-sm font-medium hover:bg-muted/80"
                    >
                        I'm Done
                    </button>
                </div>
            )}

            {step === "REPORT" && (
                <div className="flex flex-col items-center justify-center py-12 space-y-6">
                    <Loader2 className="w-12 h-12 text-primary animate-spin" />
                    <div className="text-center space-y-2">
                        <h3 className="text-xl font-semibold">Analyzing Voice Biomarkers...</h3>
                        <p className="text-muted-foreground text-sm">Extracting stress & fatigue levels</p>
                    </div>
                </div>
            )}

            {step === "DONE" && (
                <div className="flex flex-col items-center justify-center py-8 space-y-4">
                    <CheckCircle className="w-16 h-16 text-green-500" />
                    <h2 className="text-xl font-semibold">Check-in Complete</h2>
                    <div className="flex gap-4 text-center">
                        <div>
                            <p className="text-xs text-muted-foreground uppercase">Stress</p>
                            <p className="text-2xl font-bold">{stress}/10</p>
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground uppercase">Fatigue</p>
                            <p className="text-2xl font-bold">{fatigue}/10</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
