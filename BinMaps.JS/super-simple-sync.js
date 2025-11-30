// ===========================
// 📍 PLACEMENT: PASTE THIS AFTER LINE ~730 in script.js
// (After SmartBinSensor class, before loadContainersFromJson)
// ===========================

// ===========================
// SUPER SIMPLE BACKEND SYNC
// Just fetch data every 20 seconds and display it
// ===========================

/**
 * Load containers from backend
 * That's it. Just fetch and display.
 */
async function loadContainersFromBackend() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/TrashContainer/api/containers`, {
            method: 'GET',
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error(`Failed to load: ${response.status}`);
        }

        const backendData = await response.json();

        if (backendData && backendData.length > 0) {
            // Just use the data as-is from backend
           containerData = data.map(b => ({
            id: b.Id,                                    // ← Was b.id
            containerId: `BIN-${String(b.Id).padStart(3, '0')}`,
            fillLevel: b.FillPercentage,                 // ← Was b.percentage
            temperature: b.Temperature,
            batteryLevel: b.BatteryPercentage,
            lat: b.LocationX,                            // ← Was b.latitude
            lng: b.LocationY,                            // ← Was b.longitude
            lon: b.LocationY,                            // ← Was b.longitude
            zone: b.AreaId === 1 ? 'north' : 'south',   // ← Was b.zone
            status: b.FillPercentage < 50 ? 'empty' : b.FillPercentage < 80 ? 'warning' : 'critical',
            capacity: b.Capacity * 1000,                 // Backend is in m³, convert to liters
            address: `Container #${b.Id}`,
            fireRisk: b.Temperature > 45,
            distanceFromSensor: 0,
            signalStrength: -50 - Math.random() * 40,
            sensorHealth: 'operational',
            timestamp: new Date().toISOString()
        }));

            updateDashboardStats();
            
            // Update maps if they exist
            if (adminMap) displayAdminBins('all');
            if (collectorMap) displayCollectorBins();
            if (userMap) displayUserZones();

            console.log(`✅ Loaded ${backendData.length} containers`);
            return true;
        }

        return false;

    } catch (error) {
        console.warn('⚠️ Backend unavailable:', error.message);
        return false;
    }
}

/**
 * Mark bins as collected
 */
async function disposeContainers(containerIds) {
    try {
        await fetch(`${API_BASE_URL}/api/TrashContainer/api/DisposeOfTrash`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(containerIds)
        });

        console.log(`✅ Marked ${containerIds.length} bins as collected`);
        
        // Reload data from backend
        await loadContainersFromBackend();
        
        return true;

    } catch (error) {
        console.error('❌ Failed:', error.message);
        return false;
    }
}

/**
 * UPDATED: Mark bin as collected (for collector dashboard)
 */
async function confirmMarkBin(binId) {
    const bin = containerData.find(b => b.id === binId);
    if (!bin) return;

    closeMarkBinModal();

    const success = await disposeContainers([bin.id]);

    if (success) {
        collectedBins.add(bin.id);
        collectorCompleted++;
        updateCollectorProgress();
        
        if (collectorMap) displayCollectorBins();

        showNotification(`✅ Container #${bin.containerId} collected!`, 'success');
    }
}

// Make functions accessible in console
window.loadContainersFromBackend = loadContainersFromBackend;
window.disposeContainers = disposeContainers;

// ===========================
// 📍 UPDATE INITIALIZATION (Line ~1920)
// Replace your DOMContentLoaded section
// ===========================

/*
FIND THIS (around line 1920):

document.addEventListener('DOMContentLoaded', async () => {
    console.log('%c🗑️ BinMaps - Smart Waste Management System', ...);
    
    await loadContainersFromJson();
    
    await checkAuth();
    updateLiveStatus();
    startAutoRefresh();
    
    setInterval(updateAllSensors, 5000);  // ❌ DELETE THIS
});


REPLACE WITH:

document.addEventListener('DOMContentLoaded', async () => {
    console.log('%c🗑️ BinMaps - Smart Waste Management System', 'font-size: 20px; font-weight: bold; color: #10b981');

    const homeLoginBtn = document.getElementById('homeLoginBtn');
    if (homeLoginBtn) {
        homeLoginBtn.addEventListener('click', () => {
            showLoginScreen();
        });
    }

    // Load from backend, fallback to JSON
    const loaded = await loadContainersFromBackend();
    if (!loaded) {
        await loadContainersFromJson();
        console.log('  ✓ Using JSON fallback');
    }
    
    await checkAuth();
    updateLiveStatus();
    startAutoRefresh();

    // Fetch from backend every 20 seconds
    setInterval(async () => {
        await loadContainersFromBackend();
    }, 20000);

    console.log('  ✓ Backend sync every 20s');
    console.log('%c🚀 Ready!', 'font-size: 14px; font-weight: bold; color: #10b981');
});
*/

// ===========================
// THAT'S IT! Simple as that.
// ===========================

/*
What happens:
1. Page loads → fetch from backend
2. Every 20s → fetch from backend again
3. Backend updates percentages → we just display them
4. User marks bin collected → tell backend → fetch updated data

No complex sync, no optimization, just:
  Backend → Frontend → Display

Simple! 🎉
*/
