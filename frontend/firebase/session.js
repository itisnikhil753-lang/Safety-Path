import { auth } from "./firebase.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js";
import { fetchAuthenticated } from "./api.js";

document.addEventListener('DOMContentLoaded', () => {
    // Immediately clear out default hardcoded values to prevent a UI flash
    const userNameElements = document.querySelectorAll('.user-name');
    const profileNameDisplay = document.getElementById('userNameDisplay');
    const profilePics = document.querySelectorAll('.profile-pic, #userAvatar, .v-avatar');
    
    userNameElements.forEach(el => el.textContent = 'Loading...');
    if (profileNameDisplay) profileNameDisplay.textContent = 'Loading...';
    
    // Replace default pfp so there is no flash
    const loadingPfpUrl = "https://ui-avatars.com/api/?name=...&background=e2e8f0&color=94a3b8";
    profilePics.forEach(img => img.src = loadingPfpUrl);

    // Clear profile page input forms if they exist
    const formInputs = document.querySelectorAll('#personalForm input');
    if (formInputs && formInputs.length >= 3) {
        formInputs[0].value = '';
        formInputs[1].value = '';
        formInputs[2].value = 'Loading...';
        if (formInputs[3]) formInputs[3].value = 'Loading...';
    }

    // Determine the current page
    const currentPath = window.location.pathname;
    const isAuthPage = currentPath.endsWith('login.html') || currentPath.endsWith('register.html') || currentPath.endsWith('/') || currentPath.endsWith('index.html');

    // Listen for authentication state changes
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            console.log("User is logged in UID:", user.uid);
            
            if (isAuthPage) {
                // If the user just clicked Sign Up, let register.js handle the redirect safely!
                if (window.isRegistering) {
                    return; 
                }
                setTimeout(() => {
                    window.location.href = 'dashboard.html';
                }, 100);
            } else {
                try {
                    // Fetch user info from our secure backend API
                    const userData = await fetchAuthenticated('/users/profile');
                    
                    if (userData && userData.name) {
                        const nameParts = userData.name.split(' ');
                        const firstName = nameParts[0];
                        
                        userNameElements.forEach(el => el.textContent = `Welcome back, ${firstName}`);
                        if (profileNameDisplay) profileNameDisplay.textContent = userData.name;

                        // Dynamically generate PFP initials based on their actual name
                        const userPfpUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.name)}&background=14B8A6&color=fff`;
                        profilePics.forEach(img => img.src = userPfpUrl);

                        // Populate the actual profile inputs
                        if (formInputs && formInputs.length >= 3) {
                            formInputs[0].value = nameParts[0] || '';
                            formInputs[1].value = nameParts.slice(1).join(' ') || '';
                            formInputs[2].value = userData.email || user.email || '';
                            if (formInputs[3]) formInputs[3].value = userData.phone || '';
                        }
                    } else {
                        console.warn("User exists in Auth, but no Firestore document was found for their Name.");
                        userNameElements.forEach(el => el.textContent = 'Welcome');
                        if (profileNameDisplay) profileNameDisplay.textContent = "SafePath User";
                        
                        const defaultPfpUrl = `https://ui-avatars.com/api/?name=SafePath+User&background=64748B&color=fff`;
                        profilePics.forEach(img => img.src = defaultPfpUrl);
                        
                        if (formInputs && formInputs.length >= 3) {
                            formInputs[2].value = user.email || '';
                        }
                    }
                } catch (error) {
                    console.error("Error fetching user data for personalization:", error);
                    
                    // Fallback to clear the "Loading..." text if the database call fails
                    userNameElements.forEach(el => el.textContent = 'Welcome');
                    if (profileNameDisplay) profileNameDisplay.textContent = "SafePath User";
                    
                    const defaultPfpUrl = `https://ui-avatars.com/api/?name=SafePath+User&background=64748B&color=fff`;
                    profilePics.forEach(img => img.src = defaultPfpUrl);
                    
                    if (formInputs && formInputs.length >= 3) {
                        formInputs[0].value = 'User';
                        formInputs[1].value = '';
                        formInputs[2].value = user.email || '';
                        if (formInputs[3]) formInputs[3].value = '';
                    }
                }
            }
        } else {
            console.log("User is not logged in");
            if (!isAuthPage) {
                window.location.href = 'login.html';
            }
        }
    });

    // Handle Logout across all pages
    const logoutElements = document.querySelectorAll('a[href="login.html"]');
    logoutElements.forEach(element => {
        if (element.textContent.toLowerCase().includes('log out') || element.textContent.toLowerCase().includes('logout')) {
            element.addEventListener('click', async (e) => {
                e.preventDefault(); 
                try {
                    await signOut(auth);
                    window.location.href = 'login.html';
                } catch (error) {
                    console.error("Error signing out:", error);
                    alert("Failed to log out");
                }
            });
        }
    });
});
