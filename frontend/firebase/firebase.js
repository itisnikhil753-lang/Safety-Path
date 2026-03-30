import { initializeApp } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyCyCQFUuYOn7DHtMIkLbDa9D0K-IE6bV6s", // CRITICAL: Replace with your new restricted API key
    authDomain: "safetyapp-4195d.firebaseapp.com",
    projectId: "safetyapp-4195d",
    storageBucket: "safetyapp-4195d.firebasestorage.app",
    messagingSenderId: "1043157268010",
    appId: "1:1043157268010:web:3752c823a8611aed0ff553",
    measurementId: "G-F3E656LFKJ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
const auth = getAuth(app);

// Initialize Cloud Firestore and get a reference to the service
const db = getFirestore(app);

export { auth, db };