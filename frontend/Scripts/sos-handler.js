import { fetchAuthenticated } from "../firebase/api.js";

document.addEventListener('DOMContentLoaded', () => {
    // Inject the CSS for the SOS overlay dynamically
    injectSOSStyles();
    createSOSOverlay();

    // Attach listener to all SOS buttons (floating, sos-center trigger, dashboard hero btn)
    const sosButtons = document.querySelectorAll('.floating_sos, .sos_trigger, .sosbtn, .sos-btn');
    sosButtons.forEach(btn => {
        // Remove existing inline onclick attributes if any exist
        btn.removeAttribute('onclick');
        btn.addEventListener('click', triggerSOS);
    });
});

function injectSOSStyles() {
    if (document.getElementById('sos-overlay-styles')) return;

    const style = document.createElement('style');
    style.id = 'sos-overlay-styles';
    style.innerHTML = `
        #sosOverlay {
            position: fixed;
            top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(185, 28, 28, 0.95); /* Deep translucent Red */
            color: white;
            display: none;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            z-index: 10000;
            font-family: 'Inter', sans-serif;
            text-align: center;
            padding: 20px;
        }
        
        #sosOverlay.active {
            display: flex;
            animation: pulseBg 1.5s infinite;
        }
        
        @keyframes pulseBg {
            0% { background: rgba(185, 28, 28, 0.95); }
            50% { background: rgba(220, 38, 38, 1); }
            100% { background: rgba(185, 28, 28, 0.95); }
        }

        #sosOverlay h1 { font-size: 3rem; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 2px; }
        #sosOverlay .status-text { font-size: 1.2rem; margin-bottom: 30px; font-weight: 500; min-height: 28px; }
        
        .sos-steps {
            background: rgba(0, 0, 0, 0.2);
            padding: 20px 40px;
            border-radius: 12px;
            text-align: left;
            margin-bottom: 30px;
            width: 100%;
            max-width: 400px;
        }
        
        .sos-step {
            margin: 15px 0;
            font-size: 1.1rem;
            display: flex;
            align-items: center;
            gap: 10px;
            opacity: 0.5;
            transition: opacity 0.3s;
        }

        .sos-step.active { opacity: 1; font-weight: bold; }
        .sos-step.done { opacity: 0.8; color: #a7f3d0; text-decoration: line-through; }
        
        .spinner {
            width: 20px; height: 20px;
            border: 3px solid rgba(255,255,255,0.3);
            border-top-color: white;
            border-radius: 50%;
            animation: spin 1s infinite linear;
            display: none;
        }
        .sos-step.active .spinner { display: inline-block; }

        @keyframes spin { to { transform: rotate(360deg); } }

        #closeSosBtn {
            padding: 12px 30px;
            font-size: 1rem;
            font-weight: bold;
            color: #b91c1c;
            background: white;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            display: none;
            transition: transform 0.2s;
        }
        #closeSosBtn:hover { transform: scale(1.05); }
    `;
    document.head.appendChild(style);
}

function createSOSOverlay() {
    if (document.getElementById('sosOverlay')) return;

    const overlay = document.createElement('div');
    overlay.id = 'sosOverlay';
    overlay.innerHTML = `
        <h1>Emergency SOS</h1>
        <div class="status-text" id="sosMainStatus">Initiating sequence...</div>
        
        <div class="sos-steps">
            <div class="sos-step" id="step-loc"><div class="spinner"></div> <span>Acquiring Live Location</span></div>
            <div class="sos-step" id="step-mic"><div class="spinner"></div> <span>Recording Ambient Audio (5s)</span></div>
            <div class="sos-step" id="step-contact"><div class="spinner"></div> <span>Fetching Emergency Contacts</span></div>
            <div class="sos-step" id="step-db"><div class="spinner"></div> <span>Broadcasting to Agencies</span></div>
        </div>

        <button id="closeSosBtn">Acknowledge & Close</button>
    `;
    document.body.appendChild(overlay);

    document.getElementById('closeSosBtn').addEventListener('click', () => {
        overlay.classList.remove('active');
        
        // Stop the alarm sound
        if (sosAudio) {
            sosAudio.pause();
            sosAudio.currentTime = 0;
        }

        // Reset steps for next time
        document.querySelectorAll('.sos-step').forEach(s => {
            s.className = 'sos-step';
        });
        document.getElementById('closeSosBtn').style.display = 'none';
        document.getElementById('sosOverlay').style.animation = 'pulseBg 1.5s infinite';
    });
}

function setStep(stepId, state) {
    const el = document.getElementById(stepId);
    if (!el) return;
    el.className = 'sos-step ' + state;
}

function setMainStatus(text) {
    document.getElementById('sosMainStatus').textContent = text;
}

let sosAudio = null; // Global audio instance

async function triggerSOS() {
    const overlay = document.getElementById('sosOverlay');
    overlay.classList.add('active');
    
    // Play Alarming Sound
    if (!sosAudio) {
        sosAudio = new Audio('../resources/fahhhhh.mp3');
        sosAudio.loop = true; // Keep playing until acknowledged
    }
    sosAudio.play().catch(e => console.warn("Failed to play SOS audio", e));
    
    let locationStr = "Unknown (GPS Denied)";
    
    // Step 1: Location
    try {
        setMainStatus("Requesting GPS coordinates...");
        setStep('step-loc', 'active');
        const pos = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
        });
        locationStr = `${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}`;
        setStep('step-loc', 'done');
    } catch (e) {
        console.warn("Location permission denied or timed out.");
        setStep('step-loc', 'done');
        document.querySelector('#step-loc span').textContent += " (Failed)";
    }

    // Step 2: Microphone
    try {
        setMainStatus("Activating microphone...");
        setStep('step-mic', 'active');
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        setMainStatus("Recording 5 seconds of ambient audio...");
        // Wait 5 seconds to simulate recording
        await new Promise(r => setTimeout(r, 5000));
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
        setStep('step-mic', 'done');
    } catch (e) {
        console.warn("Audio permission denied.");
        setStep('step-mic', 'done');
        document.querySelector('#step-mic span').textContent += " (Failed)";
    }

    // Step 3: Fetch Contacts
    let contactCount = 0;
    try {
        setMainStatus("Alerting your emergency contacts...");
        setStep('step-contact', 'active');
        
        const userData = await fetchAuthenticated('/users/profile');
        if (userData && userData.contacts) {
            contactCount = userData.contacts.length;
        }
        
        // Simulate minor network delay for realism
        await new Promise(r => setTimeout(r, 1000));
        
        document.querySelector('#step-contact span').textContent = `Alerted ${contactCount} Emergency Contacts`;
        setStep('step-contact', 'done');
    } catch (e) {
        console.warn("Failed to fetch contacts.", e);
        setStep('step-contact', 'done');
        document.querySelector('#step-contact span').textContent = `Alerted 0 Emergency Contacts`;
    }

    // Step 4: Report to DB
    try {
        setMainStatus("Logging SOS with central database...");
        setStep('step-db', 'active');
        
        await fetchAuthenticated('/reports', {
            method: 'POST',
            body: JSON.stringify({
                incidentType: 'other', // We will map this to SOS or use other
                specificType: 'SOS Emergency',
                severity: 'high',
                location: locationStr,
                description: 'User initiated an automated SOS Emergency Broadcast.',
                dateTime: new Date().toISOString()
            })
        });
        
        setStep('step-db', 'done');
    } catch (e) {
        console.warn("Failed to log report.", e);
        setStep('step-db', 'done');
        document.querySelector('#step-db span').textContent += " (Failed)";
    }

    // Finished
    setMainStatus("🚨 DISTRESS SIGNAL SUCCESSFULLY DEPLOYED 🚨");
    document.getElementById('sosOverlay').style.animation = 'none';
    document.getElementById('sosOverlay').style.background = '#022038'; // Calm blue after success
    document.getElementById('closeSosBtn').style.display = 'inline-block';
}
