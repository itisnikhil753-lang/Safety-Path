const fs = require('fs');

async function testEndpoints() {
    console.log("Starting API Sandbox Simulation...");
    const API_KEY = process.env.FIREBASE_API_KEY || "YOUR_FIREBASE_API_KEY"; // Set explicitly in env
    
    // 1. Authenticate / Create Test User
    console.log("\\n[1] Creating/Authenticating Test User via Identity Toolkit...");
    const authPayload = {
        email: "simulation_test_user@example.com",
        password: "securePassword123",
        returnSecureToken: true
    };
    
    let token = "";
    
    try {
        let authRes = await fetch("https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=" + API_KEY, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(authPayload)
        });
        
        let authData = await authRes.json();
        
        if (authData.error && authData.error.message === 'EMAIL_EXISTS') {
            console.log("    User already exists, logging in instead...");
            authRes = await fetch("https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=" + API_KEY, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(authPayload)
            });
            authData = await authRes.json();
        }
        
        if (authData.error) throw new Error(authData.error.message);
        
        token = authData.idToken;
        console.log("    Success! ID Token acquired.");
    } catch (e) {
        console.error("    Failed to authenticate:", e.message);
        return;
    }
    
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': "Bearer " + token
    };

    const endpoints = [
        { name: "Health Check", method: "GET", path: "/health", useAuth: false },
        { name: "Get Profile", method: "GET", path: "/users/profile", useAuth: true },
        { name: "Update Profile", method: "PUT", path: "/users/profile", useAuth: true, body: { name: "Test User", email: "simulation_test_user@example.com" } },
        { name: "Submit Report", method: "POST", path: "/reports", useAuth: true, body: { incidentType: "Fire", location: "20.2961, 85.8245", description: "Test fire incident" } },
        { name: "Get All Reports", method: "GET", path: "/reports", useAuth: true },
        { name: "Volunteer Apply", method: "POST", path: "/volunteers/apply", useAuth: true, body: { fullName: "Test Volunteer", phone: "1234567890", email: "volunteer_test@example.com" } },
        { name: "Volunteer Status", method: "GET", path: "/volunteers/status", useAuth: true },
        { name: "Volunteer Toggle Duty", method: "PATCH", path: "/volunteers/toggle-status", useAuth: true, body: { isOnDuty: true } }
    ];

    console.log("\\n[2] Executing Endpoint Tests...");
    for (const ep of endpoints) {
        try {
            const reqHeaders = ep.useAuth ? headers : { 'Content-Type': 'application/json' };
            const options = {
                method: ep.method,
                headers: reqHeaders
            };
            
            if (ep.body) {
                options.body = JSON.stringify(ep.body);
            }
            
            const reqUrl = BASE_URL + ep.path;
            const res = await fetch(reqUrl, options);
            const data = await res.json();
            
            if (res.ok) {
                console.log("  ✓ [" + ep.method + "] " + ep.path + " -> " + res.status + " OK");
            } else {
                console.log("  ✗ [" + ep.method + "] " + ep.path + " -> " + res.status + " Failed");
                console.log("    Error:", data);
            }
        } catch (e) {
            console.log("  ✗ [" + ep.method + "] " + ep.path + " -> Exception");
            console.log("    Exception:", e.message);
        }
    }
    console.log("\\nSimulation Complete.");
}

testEndpoints();
