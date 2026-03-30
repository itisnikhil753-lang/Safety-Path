import { fetchAuthenticated } from "../firebase/api.js";

document.addEventListener('DOMContentLoaded', () => {

    // Initialize Map for reporting component
    const map = L.map('report-map', { zoomControl: true }).setView([20.2961, 85.8245], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { 
        attribution: '&copy; OpenStreetMap' 
    }).addTo(map);

    let activeMarker = null;
    const locationInput = document.getElementById('location-coords');

    // Add marker on map click
    map.on('click', function(e) {
        setMapMarker(e.latlng.lat, e.latlng.lng);
    });

    // Handle Current Location Button
    const currentLocationBtn = document.getElementById('currentLocationBtn');
    currentLocationBtn.addEventListener('click', () => {
        if ("geolocation" in navigator) {
            currentLocationBtn.textContent = "Locating...";
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const lat = position.coords.latitude;
                    const lng = position.coords.longitude;
                    
                    map.setView([lat, lng], 15);
                    setMapMarker(lat, lng);
                    currentLocationBtn.textContent = "Use Current Location";
                },
                (error) => {
                    console.error("Error getting location:", error);
                    alert("Could not get your exact location. Please click on the map.");
                    currentLocationBtn.textContent = "Use Current Location";
                }
            );
        } else {
            alert("Geolocation is not supported by your browser");
        }
    });

    // Helper to set marker and update input
    function setMapMarker(lat, lng) {
        if (activeMarker) {
            map.removeLayer(activeMarker);
        }
        
        // Red marker for dropping pins
        activeMarker = L.circleMarker([lat, lng], {
            color: '#EF4444',
            fillColor: '#EF4444',
            fillOpacity: 0.8,
            radius: 8
        }).addTo(map);

        locationInput.value = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    }

    // Handle form submission
    const form = document.getElementById('incidentForm');
    const modal = document.getElementById('successModal');
    const closeBtn = document.querySelector('.close-btn');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Check if map point is selected
        if (!locationInput.value) {
            alert("Please select a location on the map.");
            return;
        }

        const incidentType = document.getElementById('incidentType').value;
        const severity = document.querySelector('input[name="severity"]:checked')?.value || 'low';
        const dateTime = document.getElementById('date-time').value;
        const description = document.getElementById('description').value;

        // API call to our Node.js backend
        const submitBtn = document.getElementById('submitReportBtn');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = "Submitting...";
        submitBtn.disabled = true;

        try {
            await fetchAuthenticated('/reports', {
                method: 'POST',
                body: JSON.stringify({
                    incidentType,
                    severity,
                    location: locationInput.value,
                    description,
                    dateTime
                })
            });

            // Show modal
            modal.style.display = 'flex';
            
            // Reset form
            form.reset();
            if (activeMarker) {
                map.removeLayer(activeMarker);
                activeMarker = null;
            }
        } catch (error) {
            console.error("Error submitting report:", error);
            alert("Failed to submit report. Please try again.");
        } finally {
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
    });

    // Modal Close handlers
    closeBtn.addEventListener('click', () => {
        modal.style.display = 'none';
    });

    window.addEventListener('click', (e) => {
        if (e.target == modal) {
            modal.style.display = 'none';
        }
    });

});
