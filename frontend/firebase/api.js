import { auth } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js";

const API_BASE_URL = 'http://localhost:5000/api';

/**
 * Returns a Promise that resolves with the current user once Firebase has
 * finished restoring the auth session. Rejects if the user is not logged in.
 * This prevents the race condition where auth.currentUser is null on page load.
 */
export const waitForAuthReady = () => {
    return new Promise((resolve, reject) => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            unsubscribe(); // Stop listening after the first event
            if (user) {
                resolve(user);
            } else {
                reject(new Error("User must be logged in to make this request."));
            }
        });
    });
};

/**
 * Helper function to make authenticated requests to our Node.js Backend.
 * Automatically attaches the Firebase ID token as a Bearer token.
 * Waits for Firebase auth to be ready before checking the user state.
 */
export const fetchAuthenticated = async (endpoint, options = {}) => {
    const user = await waitForAuthReady();

    const token = await user.getIdToken();
    
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers
    };

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.error || 'API Request Failed');
    }

    return data;
};
