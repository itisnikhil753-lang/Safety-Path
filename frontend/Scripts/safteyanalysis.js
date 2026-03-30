const greenDark = '#022038';
const greenMed = '#14B8A6';
const greenLight = '#99f6e4';
const greyLight = '#E5E7EB';

import { fetchAuthenticated } from "../firebase/api.js";

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Fetch real data from data.gov.in (via our backend proxy)
    const stats = await fetchExternalStats();
    
    // 2. Fetch real-time reports summary from our database
    const summary = await fetchReportsSummary();
    
    // 3. Initialize Charts with real or fallback data
    initTrendChart(stats);
    initOffensesChart(stats);
    
    // 4. Update Gauge and Summary Stats
    const safetyScore = calculateSafetyScore(stats);
    initSafetyChart(safetyScore);
    initSummaryStats(stats, summary);
    initStatusChart(summary);

    // 5. Update Map Marker
    updateMapMarker(safetyScore);
});

async function fetchExternalStats() {
    try {
        const response = await fetchAuthenticated('/reports/external-stats');
        return response;
    } catch (error) {
        console.error("Failed to fetch external stats:", error);
        return { success: false, fallback: true };
    }
}

async function fetchReportsSummary() {
    try {
        const response = await fetchAuthenticated('/reports/summary');
        return response;
    } catch (error) {
        console.error("Failed to fetch reports summary:", error);
        return { success: false };
    }
}

function calculateSafetyScore(stats) {
    // A simple logic: 100 minus a penalty based on crime rate
    // Odisha baseline 2022: ~178,190 IPC Crimes. 
    // If crime rate is around national average (~4/1000 people), score is ~82.
    if (stats.success && stats.records) {
        const r = stats.records[0];
        const total = parseInt(r.total_ipc_crimes_2022 || 178190);
        
        // Hypothetical calculation: 100 - (Total / 5000)
        // Adjusting factor to keep it within realistic range (75-95)
        let score = 100 - (total / 10000);
        return Math.min(Math.max(Math.round(score), 70), 98);
    }
    return 82; // Fallback
}

function initTrendChart(stats) {
    const ctxTrend = document.getElementById('trendChart').getContext('2d');
    
    let labels = ['2018', '2019', '2020', '2021', '2022'];
    let data = [105000, 112000, 121525, 155420, 178190]; // Mixed with historical if live fails

    if (stats.success && stats.records) {
        // If we have multi-year records, sort and use them
        // For the 2020-2022 dataset, we map the columns
        const odisha = stats.records[0]; // Assuming filtered to one row or relevant ones
        labels = ['2020', '2021', '2022'];
        data = [
            parseInt(odisha.total_ipc_crimes_2020 || 121525),
            parseInt(odisha.total_ipc_crimes_2021 || 155420),
            parseInt(odisha.total_ipc_crimes_2022 || 178190)
        ];
    }

    new Chart(ctxTrend, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Official IPC Crimes (Odisha)',
                data: data,
                borderColor: greenDark,
                backgroundColor: 'rgba(2, 32, 56, 0.1)',
                fill: true,
                tension: 0.4
            }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: true, position: 'bottom' } } }
    });
}

function initOffensesChart(stats) {
    const ctxOffenses = document.getElementById('offensesChart').getContext('2d');
    
    // Default categories based on NCRB standard reporting
    let labels = ['Theft', 'Rape', 'Assault', 'Murder', 'Kidnapping'];
    let year2021 = [14230, 3327, 2540, 1394, 5670];
    let year2022 = [16450, 3120, 2890, 1420, 6120];

    if (stats.success && stats.records) {
        const r = stats.records[0];
        year2021 = [
            parseInt(r.theft_2021 || 14230),
            parseInt(r.rape_2021 || 3327),
            parseInt(r.assault_on_women_2021 || 2540),
            parseInt(r.murder_2021 || 1394),
            parseInt(r.kidnapping_abduction_2021 || 5670)
        ];
        year2022 = [
            parseInt(r.theft_2022 || 16450),
            parseInt(r.rape_2022 || 3120),
            parseInt(r.assault_on_women_2022 || 2890),
            parseInt(r.murder_2022 || 1420),
            parseInt(r.kidnapping_abduction_2022 || 6120)
        ];
    }

    new Chart(ctxOffenses, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                { label: '2021 (Full Year)', data: year2021, backgroundColor: greenMed },
                { label: '2022 (Full Year)', data: year2022, backgroundColor: greenDark }
            ]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top' } } }
    });
}

function initSummaryStats(stats, summary) {
    // 1. Official Datagov Stats (Existing)
    if (stats.success && stats.records) {
        const r = stats.records[0];
        const total2022 = parseInt(r.total_ipc_crimes_2022 || 178190);
        
        // Update Total Crimes Text in the status donut
        const totalCrimeEl = document.querySelector('.donut-text h3');
        if (totalCrimeEl) {
            totalCrimeEl.textContent = total2022.toLocaleString();
        }

        const totalCrimeSubEl = document.querySelector('.donut-text p');
        if (totalCrimeSubEl) {
            totalCrimeSubEl.textContent = "Official IPC (2022)";
        }
    }

    // 2. Community Contribution Stats (New)
    if (summary.success && summary.metrics) {
        const m = summary.metrics;
        
        // Total Reports
        const reportsEl = document.getElementById('totalReportsCount');
        if (reportsEl) reportsEl.textContent = m.totalReports.toLocaleString();

        // Verification Rate
        const verifyEl = document.getElementById('verificationRatePerc');
        if (verifyEl) verifyEl.textContent = m.verificationRate;

        // Active Contributors
        const contributorsEl = document.getElementById('activeContributorsCount');
        if (contributorsEl) contributorsEl.textContent = m.activeContributors.toLocaleString();

        // MoM Engagement
        const engagementEl = document.getElementById('engagementTrend');
        if (engagementEl) {
            engagementEl.textContent = m.momTrend;
            // Optional: Color coding based on positive/negative
            if (m.momTrend.startsWith('+')) {
                engagementEl.style.color = '#10B981'; // Green
            } else if (m.momTrend.startsWith('-')) {
                engagementEl.style.color = '#EF4444'; // Red
            }
        }
    }
}

function initSafetyChart(score) {
    const ctxSafety = document.getElementById('safetyChart').getContext('2d');
    
    // Update center text for safety score
    const safetyValEl = document.querySelector('.gauge-text h3');
    if (safetyValEl) {
        safetyValEl.textContent = score;
    }
    
    const safetyStatusEl = document.querySelector('.gauge-text p');
    if (safetyStatusEl) {
        safetyStatusEl.textContent = score >= 80 ? 'Good' : (score >= 60 ? 'Average' : 'Warning');
    }

    new Chart(ctxSafety, {
        type: 'doughnut',
        data: { 
            labels: ['Score', 'Remaining'], 
            datasets: [{ 
                data: [score, 100 - score], 
                backgroundColor: [greenMed, greyLight], 
                borderWidth: 0 
            }] 
        },
        options: { responsive: true, maintainAspectRatio: false, cutout: '80%', circumference: 180, rotation: 270, plugins: { legend: { display: false }, tooltip: { enabled: false } } }
    });
}

function initStatusChart(summary) {
    const ctxStatus = document.getElementById('statusChart').getContext('2d');
    
    let openCount = 8;
    let closedCount = 92;

    if (summary.success && summary.counts) {
        const c = summary.counts;
        openCount = c.pending || 0;
        closedCount = (c.verified || 0) + (c.resolved || 0) + (c.closed || 0);
        
        // If everything is zero (new system), show placeholder
        if (openCount === 0 && closedCount === 0) {
            openCount = 1;
            closedCount = 0;
        }

        // Update Total Crimes label for status if available
        const totalIncidentsEl = document.querySelector('.donut-text h3');
        if (totalIncidentsEl && !document.querySelector('.donut-text p').textContent.includes("IPC")) {
            totalIncidentsEl.textContent = c.total.toLocaleString();
        }
    }

    new Chart(ctxStatus, {
        type: 'doughnut',
        data: { 
            labels: ['Closed Incidents', 'Open Incidents'], 
            datasets: [{ 
                data: [closedCount, openCount], 
                backgroundColor: [greenDark, greyLight], 
                borderWidth: 0 
            }] 
        },
        options: { responsive: true, maintainAspectRatio: false, cutout: '85%', rotation: 180, plugins: { legend: { display: false } } }
    });
}

// Leaflet Map Initialization
const map = L.map('map', { zoomControl: true }).setView([20.2961, 85.8245], 12);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap' }).addTo(map);

function updateMapMarker(score) {
    const marker = L.circleMarker([20.2961, 85.8245], {
        color: greenDark, fillColor: greenDark, fillOpacity: 0.8, radius: 32
    }).addTo(map);

    marker.bindTooltip(`<b style='color:white; font-size: 14px;'>${score}% Safe</b>`, {
        permanent: true, direction: 'center', className: 'map-label'
    }).openTooltip();
}

// Map Expansion Logic
const mapSection = document.querySelector('.map-section');
const expandBtn = document.getElementById('expandBtn');

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
    }, 350); 
});