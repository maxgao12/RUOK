"use client";

import React, { useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceArea } from "recharts";
import { AlertTriangle, TrendingUp, TrendingDown, Activity, Info } from "lucide-react";

export interface CheckIn {
    date: string;
    energy: number;
    stress: number;
    speechRate: number;
}

// Mock Data representing a user drifting into "Lethargy/Stress"
const MOCK_HISTORY: CheckIn[] = [
    { date: "Mon", energy: 0.8, stress: 3, speechRate: 4.2 },
    { date: "Tue", energy: 0.75, stress: 4, speechRate: 4.1 },
    { date: "Wed", energy: 0.72, stress: 3, speechRate: 4.0 },
    { date: "Thu", energy: 0.6, stress: 6, speechRate: 3.5 },
    { date: "Fri", energy: 0.4, stress: 7, speechRate: 3.0 }, // Dip starts
    { date: "Sat", energy: 0.35, stress: 8, speechRate: 2.8 },
    { date: "Sun", energy: 0.3, stress: 8, speechRate: 2.5 }, // Today
];

export default function Dashboard({ latestCheckIn, history }: { latestCheckIn?: any, history?: CheckIn[] }) {

    // Memoize data merging latest checkin if valid
    const data = useMemo(() => {
        if (history && history.length > 0) return history;

        if (!latestCheckIn) return MOCK_HISTORY;
        // Append latest if not already there (simple hack for demo)
        return [...MOCK_HISTORY, {
            date: "Today",
            energy: latestCheckIn.features.rms * 10, // Assuming RMS is small, scale it for visuals
            stress: latestCheckIn.selfReport.stress,
            speechRate: latestCheckIn.features.speechRate * 10 // Mock scale
        }];
    }, [latestCheckIn, history]);

    return (
        <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-6 p-4">
            {/* Trends Section */}
            <div className="col-span-1 md:col-span-2 bg-card border border-border rounded-xl p-6">
                <h3 className="text-xl font-bold mb-4 flex items-center">
                    <Activity className="w-5 h-5 mr-2 text-primary" />
                    Weekly Insights
                </h3>

                {/* Mock Insight */}
                <div className="bg-yellow-500/10 border border-yellow-500/50 rounded-lg p-4 flex items-start space-x-3 mb-4">
                    <AlertTriangle className="w-5 h-5 text-yellow-500 mt-1 shrink-0" />
                    <div>
                        <h4 className="font-semibold text-yellow-500">Drift Detected</h4>
                        <p className="text-sm text-yellow-200/80 mt-1">
                            Your <strong>Energy Limit</strong> has been trending down for 3 consecutive days, coinciding with rose reported stress.
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">
                            Values drifted 1.5σ from your 14-day baseline.
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Energy Chart */}
                    <div className="h-48 bg-muted/30 rounded-lg p-3">
                        <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2">Energy & Vitality</h4>
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={data}>
                                <XAxis dataKey="date" hide />
                                <YAxis domain={[0, 1]} hide />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a' }}
                                    itemStyle={{ color: '#fafafa' }}
                                />
                                <ReferenceArea y1={0.6} y2={1.0} fill="#3b82f6" fillOpacity={0.1} />
                                <Line type="monotone" dataKey="energy" stroke="#3b82f6" strokeWidth={2} dot={false} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Stress Chart */}
                    <div className="h-48 bg-muted/30 rounded-lg p-3">
                        <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2">Reported Stress</h4>
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={data}>
                                <XAxis dataKey="date" hide />
                                <YAxis domain={[0, 10]} hide />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a' }}
                                    itemStyle={{ color: '#fafafa' }}
                                />
                                <Line type="monotone" dataKey="stress" stroke="#ef4444" strokeWidth={2} dot={false} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
}
