const { admin } = require('../config/firebaseAdmin');

const verifyToken = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Unauthorized, no Bearer token provided' });
        }

        const token = authHeader.split(' ')[1];
        
        // Verify token with Firebase Admin
        const decodedToken = await admin.auth().verifyIdToken(token);
        
        // Attach user info to request object
        req.user = decodedToken;
        
        next();
    } catch (error) {
        console.error("Token verification failed:", error);
        return res.status(403).json({ error: 'Forbidden, invalid or expired token' });
    }
};

module.exports = { verifyToken };
