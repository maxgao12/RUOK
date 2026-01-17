"use client";

import { useState, useEffect } from "react";
import VoiceRecorder from "@/components/VoiceRecorder";
import Dashboard, { CheckIn } from "@/components/Dashboard";
import { Mic } from "lucide-react";

export default function Home() {
  const [view, setView] = useState<"CHECK_IN" | "DASHBOARD">("CHECK_IN");
  const [latestData, setLatestData] = useState<any>(null);
  const [history, setHistory] = useState<CheckIn[]>([]);

  const fetchHistory = async () => {
    try {
      const res = await fetch("/api/history");
      const data = await res.json();
      if (data.history) {
        setHistory(data.history);
      }
    } catch (e) {
      console.error("Failed to fetch history", e);
    }
  };

  // Fetch history on mount so we have it ready
  useEffect(() => {
    fetchHistory();
  }, []);

  const [isCalibration, setIsCalibration] = useState(false);

  // Initial check: If no history, assume we need calibration
  useEffect(() => {
    if (history.length === 0) {
      setIsCalibration(true);
    } else {
      setIsCalibration(false);
    }
  }, [history]);

  const handleCheckInComplete = async (data: any) => {
    try {
      await fetch("/api/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, isCalibration })
      });
    } catch (e) {
      console.error("Failed to save check-in", e);
    }

    setLatestData(data);

    // Slight delay to show "Saved" state
    setTimeout(async () => {
      await fetchHistory();
      // If we just calibrated, turn off calibration mode
      if (isCalibration) {
        setIsCalibration(false);
      }
      setView("DASHBOARD");
    }, 1500);
  };

  return (
    <div className="w-full max-w-5xl flex flex-col items-center">
      <header className="w-full flex justify-between items-center mb-8 px-4">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <Mic className="text-primary-foreground w-5 h-5" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Are u ok?</h1>
        </div>
        <div className="text-sm text-muted-foreground">
          {new Date().toLocaleDateString("en-US", { weekday: 'long', month: 'long', day: 'numeric' })}
        </div>
      </header>

      <main className="w-full flex flex-col items-center">
        {view === "CHECK_IN" && (
          <div className="w-full max-w-lg animate-in fade-in slide-in-from-bottom-4 duration-500">

            {isCalibration ? (
              <div className="text-center mb-8">
                <span className="inline-block px-3 py-1 bg-blue-500/10 text-blue-500 rounded-full text-xs font-semibold tracking-widest uppercase mb-4">
                  Onboarding
                </span>
                <h2 className="text-3xl font-light mb-2">Welcome, Max.</h2>
                <p className="text-xl text-muted-foreground">
                  Let's calibrate your voice. Please record a "Neutral" sample where you feel okay.
                </p>
              </div>
            ) : (
              <div className="text-center mb-8">
                <h2 className="text-3xl font-light mb-2">Hi, Max.</h2>
                <p className="text-xl text-muted-foreground">Are you okay today?</p>
              </div>
            )}

            <VoiceRecorder onComplete={handleCheckInComplete} />

            <button
              onClick={() => setView("DASHBOARD")}
              className="mt-8 text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              Skip to Dashboard
            </button>

            {!isCalibration && (
              <button
                onClick={() => setIsCalibration(true)}
                className="mt-4 text-xs text-muted-foreground/50 hover:text-muted-foreground block mx-auto"
              >
                Recalibrate Baseline
              </button>
            )}
          </div>
        )}

        {view === "DASHBOARD" && (
          <div className="w-full flex flex-col items-center animate-in fade-in zoom-in-95 duration-500">
            <div className="w-full max-w-4xl flex justify-between items-center mb-4 px-4">
              <h2 className="text-2xl font-semibold">Your Trends</h2>
              <button
                onClick={() => setView("CHECK_IN")}
                className="text-sm bg-muted px-4 py-2 rounded-full hover:bg-muted/80"
              >
                New Check-in
              </button>
            </div>
            <Dashboard latestCheckIn={latestData} history={history} />
          </div>
        )}
      </main>
    </div>
  );
}
