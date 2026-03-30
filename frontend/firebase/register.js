import { auth, db } from "./firebase.js";
import { createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js";
import { doc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {
    const registerForm = document.getElementById('registerForm');
    
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const fullName = document.getElementById('fullname').value.trim();
            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirm-password').value;
            
            // Basic validation
            if (password !== confirmPassword) {
                alert("Passwords do not match!");
                return;
            }
            
            try {
                window.isRegistering = true; // Tell session.js not to redirect us yet!
                // Register user with Firebase Authentication
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                const user = userCredential.user;
                
                // Store additional user data in Firestore
                await setDoc(doc(db, "users", user.uid), {
                    name: fullName,
                    email: email,
                    createdAt: serverTimestamp()
                });
                
                alert('Account created successfully!');
                window.location.href = 'dashboard.html';
            } catch (error) {
                console.error("Error signing up:", error);
                let errorMessage = "Failed to create account.";
                if (error.code === 'auth/email-already-in-use') {
                    errorMessage = "This email is already registered.";
                } else if (error.code === 'auth/weak-password') {
                    errorMessage = "Password should be at least 6 characters.";
                }
                alert(errorMessage);
            }
        });
    }
});
