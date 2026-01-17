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
        "When the sunlight strikes raindrops in the air, they act like a prism and form a rainbow.",
        "The quick brown fox jumps over the lazy dog.",
        "I am happy to join with you today in what will go down in history as the greatest demonstration for freedom in the history of our nation.",
        "To be, or not to be, that is the question: Whether 'tis nobler in the mind to suffer The slings and arrows of outrageous fortune."
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

    const stopRecording = async () => {
        if (!analyzerRef.current) return;
        try {
            const result = await analyzerRef.current.stop();
            setFeatures(result);
            setStep("REPORT");
        } catch (e) {
            console.error("Error stopping:", e);
        }
    };

    const submitCheckIn = () => {
        if (features) {
            onComplete({
                features,
                selfReport: { stress, fatigue },
            });
            setStep("DONE");
        }
    };

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
                </div>
            )}



            // ... (rest of component) ...

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
                <div className="space-y-6">
                    <h3 className="text-xl font-semibold text-center">Quick Self Check</h3>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-2 flex justify-between">
                                <span>Fatigue Level</span>
                                <span className="text-muted-foreground">{fatigue}/10</span>
                            </label>
                            <input
                                type="range"
                                min="1"
                                max="10"
                                value={fatigue}
                                onChange={(e) => setFatigue(Number(e.target.value))}
                                className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                            />
                            <div className="flex justify-between text-xs text-muted-foreground mt-1">
                                <span>Wide Awake</span>
                                <span>Exhausted</span>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2 flex justify-between">
                                <span>Perceived Stress</span>
                                <span className="text-muted-foreground">{stress}/10</span>
                            </label>
                            <input
                                type="range"
                                min="1"
                                max="10"
                                value={stress}
                                onChange={(e) => setStress(Number(e.target.value))}
                                className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                            />
                            <div className="flex justify-between text-xs text-muted-foreground mt-1">
                                <span>Calm</span>
                                <span>Overwhelmed</span>
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={submitCheckIn}
                        className="w-full py-3 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-blue-600 transition-colors"
                    >
                        Complete Check-In
                    </button>
                </div>
            )}

            {step === "DONE" && (
                <div className="flex flex-col items-center justify-center py-8 space-y-4">
                    <CheckCircle className="w-16 h-16 text-green-500" />
                    <h2 className="text-xl font-semibold">Check-in Saved</h2>
                    <p className="text-center text-muted-foreground text-sm">
                        Analyzing trends...
                    </p>
                </div>
            )}
        </div>
    );
}
