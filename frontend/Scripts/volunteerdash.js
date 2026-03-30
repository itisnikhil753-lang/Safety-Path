import { fetchAuthenticated } from "../firebase/api.js";

document.addEventListener('DOMContentLoaded', async () => {
    // ── Fetch and display volunteer name from database ────────────────────────────
    try {
        const userData = await fetchAuthenticated('/users/profile');
        if (userData && userData.name) {
            document.getElementById('vName').textContent = userData.name;
            document.getElementById('vAvatar').src =
                `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.name)}&background=14B8A6&color=fff`;
        }
    } catch (err) {
        console.error("Failed to load volunteer profile:", err);
        document.getElementById('vName').textContent = 'Volunteer';
    }

    // ── 1. Initialize Map ──────────────────────────────────────────────────────
    const map = L.map('v-map', { zoomControl: true }).setView([20.2961, 85.8245], 13);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap'
    }).addTo(map);

    // Coordinate mapping for mock requests
    const incidentCoords = {
        'req-1': [20.3061, 85.8145], // Near Central Mall
        'req-2': [20.3561, 85.8155]  // KIIT Road
    };

    let activeRouteLayer = null;
    let volunteerMarker = null;

    // Icons
    const volunteerIcon = L.icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
    });

    const incidentIcon = L.icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
    });

    // ── 2. Duty Status Toggle ──────────────────────────────────────────────────
    const toggleBtn = document.getElementById('dutyToggleBtn');
    const statusText = document.getElementById('dutyStatusText');
    const requestsList = document.querySelector('.requests-list');

    let isOnline = false;
    requestsList.style.opacity = '0.5';
    requestsList.style.pointerEvents = 'none';

    toggleBtn.addEventListener('change', (e) => {
        isOnline = e.target.checked;
        if (isOnline) {
            statusText.textContent = "On Duty - Ready";
            statusText.classList.add('status-on');
            requestsList.style.opacity = '1';
            requestsList.style.pointerEvents = 'auto';
        } else {
            statusText.textContent = "Currently Offline";
            statusText.classList.remove('status-on');
            requestsList.style.opacity = '0.5';
            requestsList.style.pointerEvents = 'none';
        }
    });

    // ── 3. Routing Logic ───────────────────────────────────────────────────────
    
    async function calculateFastestRoute(startCoords, destCoords) {
        try {
            const url = `https://router.project-osrm.org/route/v1/driving/${startCoords[1]},${startCoords[0]};${destCoords[1]},${destCoords[0]}?overview=full&geometries=geojson`;
            const response = await fetch(url);
            const data = await response.json();

            if (data.code !== 'Ok') throw new Error("OSRM Routing failed");

            const route = data.routes[0];
            const coordinates = route.geometry.coordinates.map(c => [c[1], c[0]]);

            // Clear previous route
            if (activeRouteLayer) map.removeLayer(activeRouteLayer);

            // Add new route polyline
            activeRouteLayer = L.polyline(coordinates, {
                color: '#14B8A6',
                weight: 6,
                opacity: 0.8
            }).addTo(map);

            // Fit map to show full route
            map.fitBounds(activeRouteLayer.getBounds(), { padding: [50, 50] });

            return true;
        } catch (err) {
            console.error("Routing error:", err);
            return false;
        }
    }

    window.acceptRequest = function(reqId) {
        if (!isOnline) return;

        const destCoords = incidentCoords[reqId];
        if (!destCoords) {
            console.error("No coordinates found for request:", reqId);
            return;
        }

        const card = document.getElementById(reqId);
        const actionsDiv = card.querySelector('.req-actions');
        const originalHTML = actionsDiv.innerHTML;

        actionsDiv.innerHTML = `<button class="btn-accept" style="width:100%; background:#64748B; cursor:wait;">Locating...</button>`;

        // 1. Get current location
        navigator.geolocation.getCurrentPosition(async (position) => {
            const volunteerCoords = [position.coords.latitude, position.coords.longitude];

            actionsDiv.innerHTML = `<button class="btn-accept" style="width:100%; background:#022038; cursor:wait;">Calculating Route...</button>`;

            // 2. Add/Move Volunteer Marker
            if (volunteerMarker) map.removeLayer(volunteerMarker);
            volunteerMarker = L.marker(volunteerCoords, { icon: volunteerIcon })
                .addTo(map)
                .bindPopup("Your Location")
                .openPopup();

            // Add Incident Marker
            L.marker(destCoords, { icon: incidentIcon })
                .addTo(map)
                .bindPopup("Incident Location");

            // 3. Calculate Route
            const success = await calculateFastestRoute(volunteerCoords, destCoords);

            if (success) {
                actionsDiv.innerHTML = `<button class="btn-accept" style="width:100%; background:#10B981; cursor:default;">Route Active - Proceed</button>
                                       <button class="btn-ignore" onclick="resetMission()" style="background:#fef2f2; border-color:#fee2e2; color:#ef4444;">Cancel</button>`;
                
                showToast("Fastest route calculated. Proceed to location!");
            } else {
                actionsDiv.innerHTML = originalHTML;
                alert("Routing failed. Please check your connection.");
            }

        }, (err) => {
            console.error("Location error:", err);
            actionsDiv.innerHTML = originalHTML;
            alert("Could not access your location. Please check browser permissions.");
        });
    }

    window.resetMission = function() {
        if (activeRouteLayer) map.removeLayer(activeRouteLayer);
        if (volunteerMarker) map.removeLayer(volunteerMarker);
        map.setView([20.2961, 85.8245], 13);
        location.reload(); // Quick reset for the mock dashboard
    }

    function showToast(message) {
        const toast = document.getElementById('v-toast');
        toast.textContent = message;
        toast.classList.add('show');
        setTimeout(() => {
            toast.classList.remove('show');
        }, 5000);
    }

    // Ignore Request Logic
    document.querySelectorAll('.btn-ignore').forEach(btn => {
        btn.addEventListener('click', (e) => {
            if(!isOnline) return;
            const card = e.target.closest('.request-card');
            if(card) {
                card.style.display = 'none';
            }
        });
    });

    // Fix map size on container load
    setTimeout(() => {
        map.invalidateSize();
    }, 200);
});
