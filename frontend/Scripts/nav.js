document.addEventListener('DOMContentLoaded', () => {
    // Check if the menu toggle already exists to prevent duplicates
    if (!document.querySelector('.menu-toggle')) {
        const header = document.querySelector('.header');
        const nav = document.querySelector('.Nav');
        
        if (header && nav) {
            // Create the hamburger button
            const menuToggle = document.createElement('div');
            menuToggle.classList.add('menu-toggle');
            menuToggle.innerHTML = '&#9776;'; // Hamburger icon
            
            // Insert it before the navigation
            header.insertBefore(menuToggle, nav);
            
            // Add click event to toggle the menu
            menuToggle.addEventListener('click', () => {
                nav.classList.toggle('active');
            });
        }
    }
});

// User Profile Dropdown Logic
document.addEventListener('DOMContentLoaded', () => {
    const userProfile = document.querySelector('.user-profile');
    if (userProfile) {
        userProfile.addEventListener('click', (e) => {
            // Only toggle if we didn't click on the dropdown itself
            if (!e.target.closest('.profile-dropdown')) {
                const dropdown = userProfile.querySelector('.profile-dropdown');
                if (dropdown) {
                    dropdown.classList.toggle('active');
                }
            }
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!userProfile.contains(e.target)) {
                const dropdown = userProfile.querySelector('.profile-dropdown');
                if (dropdown && dropdown.classList.contains('active')) {
                    dropdown.classList.remove('active');
                }
            }
        });
    }
});

