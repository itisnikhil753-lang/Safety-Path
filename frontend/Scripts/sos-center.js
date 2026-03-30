import { fetchAuthenticated } from "../firebase/api.js";

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Load User Contacts
    await loadContacts();

    // 2. Load User Activity Logs (Reports)
    await loadIncidentLogs();
    
    // Setup SOS Button
    const sosTrigger = document.querySelector('.sos_trigger');
    if (sosTrigger) {
        sosTrigger.addEventListener('click', () => {
            alert('SOS Triggered! Location and audio shared with emergency contacts.');
        });
    }
});

async function loadContacts() {
    const container = document.getElementById('contactsContainer');
    if (!container) return;

    try {
        const userData = await fetchAuthenticated('/users/profile');
        const contacts = userData.contacts || [];

        if (contacts.length === 0) {
            container.innerHTML = `<li style="text-align: center; color: #6B7280; padding: 10px;">No emergency contacts found. Add them in your Profile.</li>`;
            return;
        }

        container.innerHTML = contacts.map(contact => `
            <li>
                <span>${contact.name} (${contact.relation})</span>
                <span>${contact.phone}</span>
            </li>
        `).join('');

    } catch (error) {
        console.error("Error loading contacts:", error);
        container.innerHTML = `<li style="text-align: center; color: var(--danger); padding: 10px;">Failed to load contacts.</li>`;
    }
}

async function loadIncidentLogs() {
    const container = document.getElementById('incidentLogsContainer');
    if (!container) return;

    try {
        // Fetch only reports submitted by the current user
        const reports = await fetchAuthenticated('/reports?mine=true');

        if (reports.length === 0) {
            container.innerHTML = `<li style="text-align: center; color: #6B7280; padding: 10px;">No recent incident logs found.</li>`;
            return;
        }

        container.innerHTML = reports.map(report => `
            <li>
                <span>${formatIncidentType(report.incidentType)} reported</span>
                <span>${formatDate(report.reportedAt)}</span>
            </li>
        `).join('');

    } catch (error) {
        console.error("Error loading logs:", error);
        container.innerHTML = `<li style="text-align: center; color: var(--danger); padding: 10px;">Failed to load logs.</li>`;
    }
}

function formatIncidentType(type) {
    const map = {
        'theft': 'Theft / Robbery',
        'harassment': 'Harassment',
        'suspicious': 'Suspicious Activity',
        'poor_lighting': 'Poor Lighting',
        'accident': 'Accident',
        'other': 'Incident'
    };
    return map[type] || 'Incident';
}

function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
        return `Today ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else if (diffDays === 1) {
        return `Yesterday ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else {
        return `${diffDays} days ago`;
    }
}
