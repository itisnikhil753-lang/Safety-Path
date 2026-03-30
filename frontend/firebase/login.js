import { auth } from "./firebase.js";
import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js";

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const googleLoginBtn = document.getElementById('googleLoginBtn');
    
    // Email/Password Login
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('password').value;
            
            try {
                await signInWithEmailAndPassword(auth, email, password);
                alert('Logged in successfully!');
                window.location.href = 'dashboard.html';
            } catch (error) {
                console.error("Error logging in:", error);
                let errorMessage = "Invalid email or password.";
                if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
                    errorMessage = "Invalid email or password.";
                }
                alert(errorMessage);
            }
        });
    }

    // Google Login
    if (googleLoginBtn) {
        googleLoginBtn.addEventListener('click', async () => {
            const provider = new GoogleAuthProvider();
            try {
                const result = await signInWithPopup(auth, provider);
                // The signed-in user info.
                const user = result.user;
                console.log("Google User:", user);
                
                alert(`Welcome ${user.displayName || 'User'}!`);
                window.location.href = 'dashboard.html';
            } catch (error) {
                console.error("Error with Google sign-in:", error);
                if (error.code !== 'auth/popup-closed-by-user') {
                    alert("Failed to sign in with Google. Please try again.");
                }
            }
        });
    }
});
