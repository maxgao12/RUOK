import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
    const checkIns = db.getCheckIns();

    // Transform for frontend dashboard (recharts format)
    // We want to return the last 7 days or all history
    const history = checkIns.map(c => ({
        date: new Date(c.timestamp).toLocaleDateString("en-US", { weekday: 'short', day: 'numeric' }),
        energy: c.features.rms, // Normalized?
        stress: c.selfReport.stress,
        speechRate: c.features.speechRate,
        originalTimestamp: c.timestamp
    }));

    return NextResponse.json({ history });
}
