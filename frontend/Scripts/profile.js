import { fetchAuthenticated } from "../firebase/api.js";

document.addEventListener('DOMContentLoaded', () => {

    // Sidebar Navigation Logic
    const navItems = document.querySelectorAll('.nav-item');
    const sections = document.querySelectorAll('.settings-section');

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            // Remove active class from all tabs
            navItems.forEach(nav => nav.classList.remove('active'));
            sections.forEach(sec => sec.classList.remove('active'));
            
            // Add active class to clicked tab
            item.classList.add('active');
            
            // Show corresponding section
            const targetId = item.getAttribute('data-target');
            if (targetId) {
                document.getElementById(targetId).classList.add('active');
                // Refresh guardian list whenever the tab is opened
                if (targetId === 'guardians') {
                    loadGuardians();
                }
            }
        });
    });

    // Handle Toast Notification
    const showToast = (message) => {
        const toast = document.getElementById("toast");
        toast.textContent = message;
        toast.classList.add("show");
        
        setTimeout(() => {
            toast.classList.remove("show");
        }, 3000);
    };

    // Form Submission Details Form
    const personalForm = document.getElementById('personalForm');
    if (personalForm) {
        personalForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const firstName = document.getElementById('firstNameInput').value;
            const lastName = document.getElementById('lastNameInput').value;
            const email = document.getElementById('emailInput').value;
            const phone = document.getElementById('phoneInput').value;

            try {
                // Send API request to update profile
                await fetchAuthenticated('/users/profile', {
                    method: 'PUT',
                    body: JSON.stringify({
                        name: `${firstName} ${lastName}`.trim(),
                        email: email,
                        phone: phone
                    })
                });
                
                showToast("Personal details updated successfully.");
            } catch (error) {
                console.error("Error updating profile:", error);
                showToast("Failed to update profile.");
            }
        });
    }

    // Toggle Switches change simulation
    const toggleSwitches = document.querySelectorAll('.toggle-switch input[type="checkbox"]');
    toggleSwitches.forEach(toggle => {
        toggle.addEventListener('change', (e) => {
            const isChecked = e.target.checked;
            const settingName = e.target.closest('.setting-item').querySelector('h4').textContent;
            console.log(`${settingName} is now ${isChecked ? 'Enabled' : 'Disabled'}`);
            
            // Just for demonstration, show toast occasionally
            showToast(`${settingName} ${isChecked ? 'Enabled' : 'Disabled'}`);
        });
    });

    // Logout logic
    const logoutBtn = document.getElementById('logoutBtn');
    if(logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            if(confirm("Are you sure you want to logout?")) {
                window.location.href = 'login.html';
            }
        });
    }

    // Load guardian network on page load
    loadGuardians();

    // Load user profile data (name, phone, email) from the database
    loadUserProfile();
});

// ─── User Profile ──────────────────────────────────────────────────────────────

async function loadUserProfile() {
    try {
        const userData = await fetchAuthenticated('/users/profile');
        if (!userData) return;

        // Sidebar name & avatar
        if (userData.name) {
            const nameEl = document.getElementById('userNameDisplay');
            const avatarEl = document.getElementById('userAvatar');
            if (nameEl) nameEl.textContent = userData.name;
            if (avatarEl) {
                avatarEl.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.name)}&background=022038&color=fff`;
            }

            // Pre-fill first/last name fields
            const parts = userData.name.trim().split(' ');
            const firstInput = document.getElementById('firstNameInput');
            const lastInput  = document.getElementById('lastNameInput');
            if (firstInput) firstInput.value = parts[0] || '';
            if (lastInput)  lastInput.value  = parts.slice(1).join(' ') || '';
        }

        // Pre-fill email (read-only)
        if (userData.email) {
            const emailInput = document.getElementById('emailInput');
            if (emailInput) emailInput.value = userData.email;
        }

        // Pre-fill phone
        if (userData.phone) {
            const phoneInput = document.getElementById('phoneInput');
            if (phoneInput) phoneInput.value = userData.phone;
        }

    } catch (err) {
        console.error("Failed to load user profile:", err);
    }
}

// ─── Guardian Network ──────────────────────────────────────────────────────────

async function loadGuardians() {
    const list = document.getElementById('guardianList');
    if (!list) return;

    list.innerHTML = '<li style="color: #64748B; font-size: 14px; padding: 12px 0;">Loading guardians...</li>';

    try {
        const userData = await fetchAuthenticated('/users/profile');
        const contacts = (userData && userData.contacts) ? userData.contacts : [];

        if (contacts.length === 0) {
            list.innerHTML = `
                <li style="color: #64748B; font-size: 14px; padding: 12px 0; text-align: center;">
                    No emergency contacts added yet. 
                    <a href="Contacts.html" style="color: #022038; font-weight: 600;">Add one now →</a>
                </li>`;
            return;
        }

        list.innerHTML = contacts.map(contact => {
            const isPrimary = contact.relation === 'Primary Guardian';
            return `
                <li>
                    <div class="guardian-info">
                        <strong>${contact.name}</strong>
                        <span>${contact.relation} &bull; ${contact.phone}</span>
                    </div>
                    ${isPrimary ? '<span class="badge primary">Primary</span>' : ''}
                </li>`;
        }).join('');

    } catch (error) {
        console.error("Error loading guardians:", error);
        list.innerHTML = '<li style="color: #EF4444; font-size: 14px; padding: 12px 0;">Failed to load contacts.</li>';
    }
}

