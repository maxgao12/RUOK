import fs from 'fs';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'db.json');

export interface CheckInRecord {
    id: string;
    timestamp: string;
    features: {
        rms: number;
        zcr: number;
        speechRate: number;
        pauseRatio: number;
    };
    selfReport: {
        stress: number;
        fatigue: number;
    };
}

export interface Database {
    checkIns: CheckInRecord[];
    baseline: {
        avgEnergy: number;
        avgStress: number;
        windowSize: number;
    };
}

let cachedDb: Database | null = null;

function readDb(): Database {
    if (cachedDb) return cachedDb;
    if (!fs.existsSync(DB_PATH)) {
        return { checkIns: [], baseline: { avgEnergy: 0.5, avgStress: 5, windowSize: 0 } };
    }
    try {
        const data = fs.readFileSync(DB_PATH, 'utf-8');
        cachedDb = JSON.parse(data);
        return cachedDb!;
    } catch (e) {
        return { checkIns: [], baseline: { avgEnergy: 0.5, avgStress: 5, windowSize: 0 } };
    }
}

function writeDb(db: Database) {
    cachedDb = db;
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

export const db = {
    getCheckIns: () => readDb().checkIns,
    addCheckIn: (record: CheckInRecord) => {
        const database = readDb();
        database.checkIns.push(record);

        // Update baseline (Simple moving average)
        const n = database.checkIns.length;
        const prevE = database.baseline.avgEnergy * (n - 1);
        const newE = (prevE + record.features.rms) / n;

        // Calculate Average Stress properly
        const prevStress = database.baseline.avgStress * (n - 1);
        const newStress = (prevStress + record.selfReport.stress) / n;

        database.baseline = {
            avgEnergy: newE,
            avgStress: newStress,
            windowSize: n
        };

        writeDb(database);
    },
    getBaseline: () => readDb().baseline
};
