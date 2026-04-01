const admin = require('firebase-admin');

// IMPORTANT: Replace this with your actual serviceAccountKey.json 
// from Firebase Project Settings -> Service Accounts -> Generate New Private Key
// For now, it will look for the file in the backend root directory.
let serviceAccount;
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
        serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    } catch (error) {
        console.error("Warning: Could not parse FIREBASE_SERVICE_ACCOUNT environment variable as JSON.");
    }
} else {
    try {
        serviceAccount = require('../serviceAccountKey.json');
    } catch (error) {
        console.error("Warning: serviceAccountKey.json is missing and no FIREBASE_SERVICE_ACCOUNT environment variable is set.");
    }
}

if (serviceAccount) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
    console.log("Firebase Admin Initialized Successfully");
}

const db = admin.firestore?.();

module.exports = { admin, db };
