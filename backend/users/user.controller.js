const { db } = require('../config/firebaseAdmin');

exports.getProfile = async (req, res, next) => {
    try {
        const uid = req.user.uid;
        
        if (!db) {
            return res.status(500).json({ error: "Database not initialized" });
        }

        const userDoc = await db.collection('users').doc(uid).get();
        if (!userDoc.exists) {
            return res.status(404).json({ error: "User not found" });
        }

        res.json(userDoc.data());
    } catch (error) {
        next(error);
    }
};

exports.updateProfile = async (req, res, next) => {
    try {
        const uid = req.user.uid;
        const { name, email, phone, address } = req.body;
        
        // Prevent users from injecting arbitrary fields by explicit whitelisting
        const updates = {};
        if (name !== undefined) updates.name = name;
        if (email !== undefined) updates.email = email;
        if (phone !== undefined) updates.phone = phone;
        if (address !== undefined) updates.address = address;
        if (req.body.contacts !== undefined) updates.contacts = req.body.contacts;

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({ error: "No valid fields provided to update." });
        }

        if (!db) {
            return res.status(500).json({ error: "Database not initialized" });
        }

        await db.collection('users').doc(uid).set(updates, { merge: true });
        
        res.json({ success: true, message: "Profile updated successfully!" });
    } catch (error) {
        next(error);
    }
};
