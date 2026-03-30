const { db } = require('../config/firebaseAdmin');

exports.getAllReports = async (req, res, next) => {
    try {
        if (!db) return res.status(500).json({ error: "Database not initialized" });

        const reportsRef = db.collection('reports');
        let query = reportsRef;

        // If 'mine' is true, filter by the current user's ID
        if (req.query.mine === 'true') {
            query = query.where('userId', '==', req.user.uid);
        }

        const snapshot = await query.get();

        const reports = [];
        snapshot.forEach(doc => {
            reports.push({ id: doc.id, ...doc.data() });
        });

        // Sort by reportedAt descending
        reports.sort((a, b) => new Date(b.reportedAt) - new Date(a.reportedAt));

        res.json(reports);
    } catch (error) {
        next(error);
    }
};

exports.getReport = async (req, res, next) => {
    try {
        if (!db) return res.status(500).json({ error: "Database not initialized" });

        const doc = await db.collection('reports').doc(req.params.id).get();
        if (!doc.exists) {
            return res.status(404).json({ error: "Report not found" });
        }

        res.json({ id: doc.id, ...doc.data() });
    } catch (error) {
        next(error);
    }
};

exports.createReport = async (req, res, next) => {
    try {
        const { incidentType, severity, location, description, dateTime } = req.body;
        
        if (!incidentType || !location) {
            return res.status(400).json({ error: "Incident type and location are required." });
        }

        if (!db) return res.status(500).json({ error: "Database not initialized" });

        const newReport = {
            incidentType,
            severity: severity || 'low',
            location,
            description: description || '',
            dateTime: dateTime || new Date().toISOString(),
            userId: req.user.uid,
            reportedAt: new Date().toISOString(),
            status: 'pending'
        };

        const docRef = await db.collection('reports').add(newReport);
        
        res.status(201).json({ success: true, id: docRef.id, message: "Report submitted successfully." });
    } catch (error) {
        next(error);
    }
};

/**
 * Proxy function to fetch official crime statistics from data.gov.in
 * Dataset: State/UT-wise Number of Indian Penal Code (IPC) Crimes (2020-2022)
 */
exports.getExternalCrimeStats = async (req, res, next) => {
    try {
        const apiKey = process.env.DATAGOV_API_KEY;
        // Using common Resource ID for State/UT-wise IPC Crimes 2020-2022
        const resourceId = '3ca38d41-1047-4045-8d7b-5a7d2aa3868f'; 
        
        if (!apiKey) {
            return res.json({ 
                success: false, 
                message: "Missing DATAGOV_API_KEY", 
                fallback: true,
                data: getFallbackData() 
            });
        }

        const url = `https://api.data.gov.in/resource/${resourceId}?api-key=${apiKey}&format=json&filters[state_ut]=Odisha`;
        
        const response = await fetch(url);
        const data = await response.json();

        if (data && data.records && data.records.length > 0) {
            res.json({
                success: true,
                source: "data.gov.in (NCRB)",
                records: data.records,
                fields: data.fields
            });
        } else {
            res.json({
                success: false,
                message: "No records found for Odisha",
                fallback: true,
                data: getFallbackData()
            });
        }
    } catch (error) {
        console.error("External API Error:", error);
        res.json({
            success: false,
            message: "Failed to fetch from data.gov.in",
            fallback: true,
            data: getFallbackData()
        });
    }
};

/**
 * Returns stable NCRB 2020-2022 IPC data for Odisha as a fail-safe.
 */
function getFallbackData() {
    return [
        { year: 2020, total_ipc: 121525, rape: 2984, murder: 1470, theft: 12140 },
        { year: 2021, total_ipc: 155420, rape: 3327, murder: 1394, theft: 14230 },
        { year: 2022, total_ipc: 178190, rape: 3120, murder: 1420, theft: 16450 }
    ];
}

/**
 * Get a summary of report counts by status for the analytics dashboard
 */
exports.getReportsSummary = async (req, res, next) => {
    try {
        if (!db) return res.status(500).json({ error: "Database not initialized" });

        const reportsRef = db.collection('reports');
        const snapshot = await reportsRef.get();

        const statusCounts = {
            pending: 0,
            verified: 0,
            resolved: 0,
            closed: 0,
            total: snapshot.size
        };

        const uniqueUsers = new Set();
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
        const sixtyDaysAgo = new Date(now.getTime() - (60 * 24 * 60 * 60 * 1000));
        
        let last30DaysCount = 0;
        let prev30DaysCount = 0;

        snapshot.forEach(doc => {
            const data = doc.data();
            
            // 1. Status Tracking
            const status = data.status || 'pending';
            if (statusCounts.hasOwnProperty(status)) {
                statusCounts[status]++;
            } else {
                statusCounts.pending++;
            }

            // 2. Active Contributors
            if (data.userId) {
                uniqueUsers.add(data.userId);
            }

            // 3. Engagement (MoM)
            const reportedAt = data.reportedAt ? new Date(data.reportedAt) : null;
            if (reportedAt) {
                if (reportedAt > thirtyDaysAgo) {
                    last30DaysCount++;
                } else if (reportedAt > sixtyDaysAgo) {
                    prev30DaysCount++;
                }
            }
        });

        // Calculate Verification Rate
        const verifiedTotal = statusCounts.verified + statusCounts.resolved;
        const verificationRate = snapshot.size > 0 ? ((verifiedTotal / snapshot.size) * 100).toFixed(1) : "0.0";

        // Calculate MoM Engagement Trend
        let momTrend = 0;
        if (prev30DaysCount > 0) {
            momTrend = (((last30DaysCount - prev30DaysCount) / prev30DaysCount) * 100).toFixed(0);
        } else if (last30DaysCount > 0) {
            momTrend = 100; // First month growth
        }

        res.json({
            success: true,
            counts: statusCounts,
            metrics: {
                totalReports: snapshot.size,
                verificationRate: `${verificationRate}%`,
                activeContributors: uniqueUsers.size,
                momTrend: momTrend >= 0 ? `+${momTrend}%` : `${momTrend}%`
            },
            lastUpdated: new Date().toISOString()
        });
    } catch (error) {
        next(error);
    }
};
