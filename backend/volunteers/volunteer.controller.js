const { db } = require('../config/firebaseAdmin');

exports.getStatus = async (req, res, next) => {
    try {
        if (!db) return res.status(500).json({ error: "Database not initialized" });

        const doc = await db.collection('volunteers').doc(req.user.uid).get();
        if (!doc.exists) {
            return res.json({ isVolunteer: false });
        }

        res.json({ isVolunteer: true, ...doc.data() });
    } catch (error) {
        next(error);
    }
};

exports.applyAsVolunteer = async (req, res, next) => {
    try {
        const { fullName, phone, email, experience, emergencyContact } = req.body;
        
        if (!fullName || !phone) {
            return res.status(400).json({ error: "Name and Phone are required." });
        }

        if (!db) return res.status(500).json({ error: "Database not initialized" });

        const volunteerData = {
            fullName,
            phone,
            email: email || req.user.email,
            experience: experience || '',
            emergencyContact: emergencyContact || '',
            userId: req.user.uid,
            appliedAt: new Date().toISOString(),
            status: 'pending',
            isOnDuty: false
        };

        await db.collection('volunteers').doc(req.user.uid).set(volunteerData);
        
        res.status(201).json({ success: true, message: "Volunteer application submitted." });
    } catch (error) {
        next(error);
    }
};

exports.toggleDutyStatus = async (req, res, next) => {
    try {
        const { isOnDuty } = req.body;

        if (typeof isOnDuty !== 'boolean') {
            return res.status(400).json({ error: "Invalid status" });
        }

        if (!db) return res.status(500).json({ error: "Database not initialized" });

        await db.collection('volunteers').doc(req.user.uid).update({
            isOnDuty: isOnDuty,
            lastStatusUpdate: new Date().toISOString()
        });
        
        res.json({ success: true, isOnDuty });
    } catch (error) {
        next(error);
    }
};
