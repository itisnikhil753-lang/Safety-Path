const admin = require('firebase-admin');

// IMPORTANT: Replace this with your actual serviceAccountKey.json 
// from Firebase Project Settings -> Service Accounts -> Generate New Private Key
// For now, it will look for the file in the backend root directory.
let serviceAccount;
try {
    serviceAccount = require('../serviceAccountKey.json');
} catch (error) {
    console.error("Warning: serviceAccountKey.json is missing. Please download it from Firebase Console and place it in the backend folder.");
}

if (serviceAccount) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
    console.log("Firebase Admin Initialized Successfully");
}

const db = admin.firestore?.();

module.exports = { admin, db };
