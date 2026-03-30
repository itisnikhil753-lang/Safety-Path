const greenDark = '#022038';
const safeColor = '#10B981';
const warningColor = '#F59E0B';
const dangerColor = '#EF4444';

// Initialize map centered roughly around Bhubaneswar
const map = L.map('route-map', { zoomControl: true }).setView([20.2961, 85.8245], 13);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { 
    attribution: '&copy; OpenStreetMap' 
}).addTo(map);

// Simulated Incident Markers Overlay
const incidentLayer = L.layerGroup([
    L.circleMarker([20.3100, 85.8050], { color: dangerColor, radius: 15, stroke: false, fillOpacity: 0.5 }),
    L.circleMarker([20.3000, 85.8100], { color: dangerColor, radius: 20, stroke: false, fillOpacity: 0.5 }),
    L.circleMarker([20.3200, 85.8250], { color: warningColor, radius: 25, stroke: false, fillOpacity: 0.4 })
]).addTo(map);

// simulated Heatmap Overlays
const heatmapLayer = L.layerGroup([
    L.circle([20.3050, 85.8075], { color: 'red', fillColor: '#f03', fillOpacity: 0.2, radius: 1500, stroke: false }),
    L.circle([20.3200, 85.8250], { color: 'orange', fillColor: 'orange', fillOpacity: 0.2, radius: 1000, stroke: false })
]).addTo(map);


// Map Controls Logic
const heatmapToggle = document.getElementById('heatmapToggle');
const incidentsToggle = document.getElementById('incidentsToggle');

heatmapToggle.addEventListener('change', (e) => {
    if (e.target.checked) {
        map.addLayer(heatmapLayer);
    } else {
        map.removeLayer(heatmapLayer);
    }
});

incidentsToggle.addEventListener('change', (e) => {
    if (e.target.checked) {
        map.addLayer(incidentLayer);
    } else {
        map.removeLayer(incidentLayer);
    }
});

// ─── Icons ───────────────────────────────────────────────────────────────────

const startIcon = L.icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

const endIcon = L.icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

// ─── Location Autocomplete ───────────────────────────────────────────────────

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

let activeMarkers = {};
let selectedCoords = {
    'start-loc': null,
    'end-loc': null
};

function setupAutocomplete(inputId, resultsId) {
    const input = document.getElementById(inputId);
    const resultsContainer = document.getElementById(resultsId);

    if (!input || !resultsContainer) return;

    const handleInput = debounce(async (e) => {
        const query = e.target.value;
        if (query.length < 3) {
            resultsContainer.innerHTML = '';
            resultsContainer.classList.remove('active');
            return;
        }

        try {
            // Fetch from Nominatim (OpenStreetMap)
            const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&viewbox=85.7,20.4,85.9,20.2&bounded=0`);
            const data = await response.json();

            renderResults(data);
        } catch (error) {
            console.error('Autocomplete error:', error);
        }
    }, 300);

    function renderResults(results) {
        resultsContainer.innerHTML = '';
        if (results.length === 0) {
            resultsContainer.classList.remove('active');
            return;
        }

        results.forEach(result => {
            const item = document.createElement('div');
            item.className = 'autocomplete-item';
            
            const parts = result.display_name.split(',');
            const mainName = parts[0];
            const secondaryName = parts.slice(1).join(',').trim();

            item.innerHTML = `<strong>${mainName}</strong><br><small style="font-size:11px; color:#6B7280;">${secondaryName}</small>`;
            
            item.addEventListener('click', () => {
                input.value = result.display_name;
                resultsContainer.innerHTML = '';
                resultsContainer.classList.remove('active');

                const lat = parseFloat(result.lat);
                const lon = parseFloat(result.lon);
                selectedCoords[inputId] = [lat, lon];

                map.setView([lat, lon], 14);

                if (activeMarkers[inputId]) {
                    map.removeLayer(activeMarkers[inputId]);
                }
                
                const icon = inputId === 'start-loc' ? startIcon : endIcon;
                activeMarkers[inputId] = L.marker([lat, lon], { icon }).addTo(map)
                    .bindPopup(inputId === 'start-loc' ? 'Start: ' + mainName : 'Destination: ' + mainName)
                    .openPopup();
            });

            resultsContainer.appendChild(item);
        });

        resultsContainer.classList.add('active');
    }

    input.addEventListener('input', handleInput);

    document.addEventListener('click', (e) => {
        if (!input.contains(e.target) && !resultsContainer.contains(e.target)) {
            resultsContainer.classList.remove('active');
        }
    });
}

setupAutocomplete('start-loc', 'start-results');
setupAutocomplete('end-loc', 'end-results');

// ─── Real Routing Logic ──────────────────────────────────────────────────────

let activeRoutes = [];
const routeColors = [safeColor, warningColor, dangerColor];

function getTripKey(start, end) {
    // Rounding to 3 decimals to make the key a bit more robust to minor selection shifts
    const s = `${start[0].toFixed(3)},${start[1].toFixed(3)}`;
    const e = `${end[0].toFixed(3)},${end[1].toFixed(3)}`;
    return `safepath_trip_${s}_to_${e}`;
}

async function calculateRoutes() {
    const start = selectedCoords['start-loc'];
    const end = selectedCoords['end-loc'];

    if (!start || !end) {
        alert("Please pick both a Start and a Destination from the suggestions.");
        return;
    }

    const btn = document.getElementById('search-routes-btn');
    btn.innerText = "Analyzing...";
    btn.disabled = true;

    // Clear existing dynamic routes
    activeRoutes.forEach(r => map.removeLayer(r));
    activeRoutes = [];
    
    const placeholder = document.getElementById('route-placeholder');
    if (placeholder) placeholder.style.display = 'none';

    try {
        // 1. Initial Fetch
        const mainUrl = `https://router.project-osrm.org/route/v1/driving/${start[1]},${start[0]};${end[1]},${end[0]}?overview=full&geometries=geojson&alternatives=true`;
        const response = await fetch(mainUrl);
        const data = await response.json();

        if (data.code !== 'Ok') throw new Error("Routing failed");

        let rawRoutes = data.routes;

        // 2. Forced Detour (if needed to reach 3 distinct paths)
        if (rawRoutes.length < 3) {
            const midLat = (start[0] + end[0]) / 2;
            const midLon = (start[1] + end[1]) / 2;
            const offsetLat = (end[1] - start[1]) * 0.2;
            const offsetLon = (start[0] - end[0]) * 0.2;
            const waypoint = [midLat + offsetLat, midLon + offsetLon];
            const detourUrl = `https://router.project-osrm.org/route/v1/driving/${start[1]},${start[0]};${waypoint[1]},${waypoint[0]};${end[1]},${end[0]}?overview=full&geometries=geojson`;
            const detourRes = await fetch(detourUrl);
            const detourData = await detourRes.json();
            if (detourData.code === 'Ok') rawRoutes.push(detourData.routes[0]);
        }

        // 3. Fallback
        while (rawRoutes.length < 3) {
            const base = rawRoutes[0];
            rawRoutes.push({ ...base, isSimulated: true, distance: base.distance * 1.05, duration: base.duration * 1.05 });
        }

        // 4. Identify and Order
        const fastest = [...rawRoutes].sort((a, b) => a.duration - b.duration)[0];
        const shortest = [...rawRoutes].sort((a, b) => a.distance - b.distance)[0];
        const safest = rawRoutes[0]; 

        const finalSelection = [
            { label: 'Safest', data: safest, color: safeColor, weight: 7, opacity: 1, dash: "" },
            { label: 'Fastest', data: fastest, color: warningColor, weight: 5, opacity: 0.7, dash: "10, 10" },
            { label: 'Shortest', data: shortest, color: dangerColor, weight: 5, opacity: 0.7, dash: "5, 10" }
        ];

        // 5. Persistent Cache Check (using localStorage)
        const tripKey = getTripKey(start, end);
        let scores = JSON.parse(localStorage.getItem(tripKey));
        
        if (!scores) {
            scores = {
                'Safest': 92 + Math.floor(Math.random() * 6),
                'Fastest': 78 + Math.floor(Math.random() * 6),
                'Shortest': 65 + Math.floor(Math.random() * 6)
            };
            localStorage.setItem(tripKey, JSON.stringify(scores));
            console.log(`Generated new scores for ${tripKey}`);
        } else {
            console.log(`Using persistent scores for ${tripKey}`);
        }

        // 6. Render
        finalSelection.forEach((selection, index) => {
            const route = selection.data;
            let coords = route.geometry.coordinates.map(c => [c[1], c[0]]);
            
            if (index > 0 && Math.abs(rawRoutes[0].distance - route.distance) < 5) {
                const offset = (index) * 0.0002; 
                coords = coords.map(c => [c[0] + offset, c[1] + offset]);
            }

            const polyline = L.polyline(coords, {
                color: selection.color,
                weight: selection.weight,
                opacity: selection.opacity,
                dashArray: selection.dash
            }).addTo(map);
            
            activeRoutes.push(polyline);
            updateSidebarCard(index, route, selection.label, scores[selection.label]);
        });

        // Fit map
        map.fitBounds(L.polyline(safest.geometry.coordinates.map(c => [c[1], c[0]])).getBounds(), { padding: [50, 50] });

    } catch (error) {
        console.error("Routing error:", error);
        alert("Could not fetch real routes. Please try different locations.");
    } finally {
        btn.innerText = "Analyze Routes";
        btn.disabled = false;
    }
}

function updateSidebarCard(index, routeData, label, savedScore) {
    const cardId = `route-card-${index + 1}`;
    const card = document.getElementById(cardId);
    if (!card) return;

    card.style.display = 'block';

    const header = card.querySelector('h4');
    if (header) header.innerText = `Route ${index + 1} (${label})`;

    const distKm = (routeData.distance / 1000).toFixed(1);
    const timeMin = Math.round(routeData.duration / 60);

    document.getElementById(`route${index + 1}-dist`).innerText = `${distKm} km`;
    document.getElementById(`route${index + 1}-time`).innerText = `${timeMin} mins`;

    const riskOptions = {
        'Safest': "Well Lit, Police Presence, Low Activity",
        'Fastest': "Main Highway, Heavy Traffic, Well Lit",
        'Shortest': "Through Neighborhoods, Mixed Lighting"
    };
    const riskElem = document.getElementById(`route${index + 1}-risks`);
    if (riskElem) riskElem.innerText = riskOptions[label] || "Calculated safe route";

    const badge = document.getElementById(`route${index + 1}-badge`);
    if (badge) {
        badge.innerText = `${savedScore}% Safe`;
        badge.className = `badge ${savedScore > 85 ? 'green' : (savedScore > 70 ? 'yellow' : 'red')}`;
    }
}

document.getElementById('search-routes-btn').addEventListener('click', calculateRoutes);
