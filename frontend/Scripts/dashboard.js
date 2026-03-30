const greenDark = '#022038';

let map;
let routePolyline;
let startMarker;
let destMarker;

let startCoords = null;
let destCoords = null;

// Initialize the Map
function initMap() {
    // Default fallback coordinates
    const defaultCoords = [20.2961, 85.8245];

    map = L.map('map', { zoomControl: true }).setView(defaultCoords, 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    // Try HTML5 geolocation to center map on user
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const userPos = [position.coords.latitude, position.coords.longitude];
                map.setView(userPos, 13);
            },
            () => {
                console.log("Geolocation blocked or failed. Using default location.");
            }
        );
    }

    setupAutocomplete();
    setupRouteSearchHandler();
    setupExpandMapLogic();
}

// Setup Nominatim Autocomplete with 500ms Debounce
function setupAutocomplete() {
    setupInput('start-location', 'start-suggestions', (coords, label) => {
        startCoords = coords;
        document.getElementById('start-location').value = label;
    });

    setupInput('destination', 'dest-suggestions', (coords, label) => {
        destCoords = coords;
        document.getElementById('destination').value = label;
    });
}

function setupInput(inputId, listId, onSelectCallback) {
    const inputField = document.getElementById(inputId);
    const suggestionList = document.getElementById(listId);
    let timeoutId;

    inputField.addEventListener('input', (e) => {
        const query = e.target.value.trim();
        clearTimeout(timeoutId);

        if (query.length < 3) {
            suggestionList.style.display = 'none';
            suggestionList.innerHTML = '';
            return;
        }

        // Debounce API calls by 500ms
        timeoutId = setTimeout(() => {
            fetchSuggestions(query, suggestionList, onSelectCallback);
        }, 500);
    });

    // Close suggestions if clicked outside
    document.addEventListener('click', (e) => {
        if (e.target !== inputField && e.target !== suggestionList) {
            suggestionList.style.display = 'none';
        }
    });

    inputField.addEventListener('focus', () => {
        if (suggestionList.children.length > 0) {
            suggestionList.style.display = 'block';
        }
    });
}

function fetchSuggestions(query, listElement, onSelectCallback) {
    // Nominatim API call (public, free)
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1`;

    fetch(url, { headers: { 'Accept-Language': 'en-US,en;q=0.9' } })
        .then(response => response.json())
        .then(data => {
            listElement.innerHTML = '';
            if (data.length === 0) {
                listElement.innerHTML = '<li style="color:#777;">No results found</li>';
            } else {
                data.forEach(place => {
                    const li = document.createElement('li');
                    li.textContent = place.display_name;
                    li.title = place.display_name;
                    // Truncate text if needed using inline styles
                    li.style.whiteSpace = 'nowrap';
                    li.style.overflow = 'hidden';
                    li.style.textOverflow = 'ellipsis';
                    
                    li.addEventListener('click', () => {
                        const lat = parseFloat(place.lat);
                        const lon = parseFloat(place.lon);
                        onSelectCallback({ lat, lon }, place.display_name);
                        listElement.style.display = 'none';
                    });
                    listElement.appendChild(li);
                });
            }
            listElement.style.display = 'block';
        })
        .catch(err => {
            console.error('Error fetching Nominatim suggestions:', err);
            listElement.innerHTML = '<li style="color:red;">Error fetching data</li>';
            listElement.style.display = 'block';
        });
}

// Handle Route Search using OSRM
function setupRouteSearchHandler() {
    const searchBtn = document.getElementById('search-route-btn');
    const routeInfo = document.getElementById('route-info');

    if (!searchBtn) return;

    searchBtn.addEventListener('click', () => {
        if (!startCoords || !destCoords) {
            alert('Please select valid start and destination locations from the suggestions.');
            return;
        }

        const originalText = searchBtn.innerText;
        searchBtn.innerText = 'Calculating...';
        searchBtn.disabled = true;
        routeInfo.style.display = 'none';

        // OSRM Driving Route API (Uses format: lon,lat)
        const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${startCoords.lon},${startCoords.lat};${destCoords.lon},${destCoords.lat}?overview=full&geometries=geojson`;

        fetch(osrmUrl)
            .then(res => res.json())
            .then(data => {
                searchBtn.innerText = originalText;
                searchBtn.disabled = false;

                if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
                    alert('Could not calculate a route between the selected locations.');
                    return;
                }

                const route = data.routes[0];
                
                // Extract metrics
                const distKm = (route.distance / 1000).toFixed(2);
                const hrs = Math.floor(route.duration / 3600);
                const mins = Math.floor((route.duration % 3600) / 60);
                let timeStr = `${mins} min`;
                if (hrs > 0) timeStr = `${hrs} hr ${mins} min`;

                routeInfo.innerHTML = `Distance: <b>${distKm} km</b> &nbsp;|&nbsp; Estimated Time: <b>${timeStr}</b>`;
                routeInfo.style.display = 'block';

                // Render Route geometry onto Map
                renderRoute(route.geometry.coordinates);
            })
            .catch(err => {
                console.error("OSRM Routing Error:", err);
                searchBtn.innerText = originalText;
                searchBtn.disabled = false;
                alert('An error occurred while fetching the route.');
            });
    });
}

function renderRoute(geoJsonCoordinates) {
    // Leaflet polyline expects [lat, lon], but GeoJSON is [lon, lat]
    const latLngs = geoJsonCoordinates.map(coord => [coord[1], coord[0]]);

    // Clear previous markers and polyline
    if (routePolyline) map.removeLayer(routePolyline);
    if (startMarker) map.removeLayer(startMarker);
    if (destMarker) map.removeLayer(destMarker);

    // Draw the polyline
    routePolyline = L.polyline(latLngs, {
        color: '#14B8A6', 
        weight: 5,
        opacity: 0.9,
        lineJoin: 'round'
    }).addTo(map);

    // Fit map bounds to polyline
    map.fitBounds(routePolyline.getBounds(), { padding: [50, 50] });

    // Custom Markers
    startMarker = L.circleMarker(latLngs[0], {
        color: '#059669', fillColor: '#10b981', fillOpacity: 1, radius: 8
    }).bindTooltip("Start").addTo(map);

    destMarker = L.circleMarker(latLngs[latLngs.length - 1], {
        color: '#dc2626', fillColor: '#ef4444', fillOpacity: 1, radius: 8
    }).bindTooltip("Destination").addTo(map);
}

// Map Expansion Logic
function setupExpandMapLogic() {
    const mapSection = document.querySelector('.map-section');
    const expandBtn = document.getElementById('expandBtn');

    if (!expandBtn || !mapSection) return;

    expandBtn.addEventListener('click', () => {
        mapSection.classList.toggle('expanded');
        
        if (mapSection.classList.contains('expanded')) {
            expandBtn.innerHTML = '&#10006;';
            expandBtn.title = "Close Map";
        } else {
            expandBtn.innerHTML = '&#9974;';
            expandBtn.title = "Expand Map";
        }

        // Delay invalidating size to allow CSS transition to finish
        setTimeout(() => {
            map.invalidateSize();
            if (routePolyline) {
                map.fitBounds(routePolyline.getBounds(), { padding: [20, 20] });
            }
        }, 350); 
    });
}

// Boot up
window.addEventListener('load', () => {
    initMap();
    // Delay invalidating size to avoid weird init rendering
    setTimeout(() => {
        map.invalidateSize();
    }, 100);
});
