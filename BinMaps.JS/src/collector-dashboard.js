// ===========================
// COLLECTOR DASHBOARD JAVASCRIPT
// ===========================

document.addEventListener('DOMContentLoaded', () => {
    // Check if we're on the collector dashboard page
    const collectorDashboard = document.getElementById('collectorDashboard');
    if (!collectorDashboard) return;
    
    initCollectorDashboard();
});

/**
 * CHANGE #11: Modified initCollectorDashboard() to fetch API data
 * Location: Collector dashboard initialization
 * Purpose: Load real container data for collectors
 */
async function initCollectorDashboard() {
    console.log('Initializing Collector Dashboard');
    
    // Fetch fresh data from API
    await getAllContainers();
    
    collectorCompleted = 0;
    updateCollectorProgress();
    
    // Button handlers
    const buttons = {
        'collectorViewRouteBtn': () => {
            const section = document.getElementById('collectorRouteSection');
            if (section) section.scrollIntoView({ behavior: 'smooth' });
        },
        'collectorViewHeatmapBtn': () => {
            initCollectorHeatmap();
            const section = document.getElementById('collectorHeatmapSection');
            if (section) section.scrollIntoView({ behavior: 'smooth' });
        },
        'viewRouteOnMap': () => {
            displayCollectorRoute();
        },
        'markBinCompleteBtn': () => {
            markBinComplete();
        }
    };
    
    // Attach event listeners
    Object.keys(buttons).forEach(btnId => {
        const btn = document.getElementById(btnId);
        if (btn) {
            const newBtn = btn.cloneNode(true);
            btn.parentNode.replaceChild(newBtn, btn);
            newBtn.addEventListener('click', buttons[btnId]);
        }
    });
    
    // Initialize map after a delay
    setTimeout(() => initCollectorHeatmap(), 500);
    
    // Update data every 30 seconds
    setInterval(async () => {
        await refreshContainerData();
        if (collectorMap) {
            displayCollectorBins();
        }
    }, 30000);
}

function initCollectorHeatmap() {
    const mapElement = document.getElementById('collectorHeatmap');
    if (!mapElement) {
        console.warn('Collector heatmap element not found');
        return;
    }
    
    // Destroy existing map if present
    if (collectorMap) {
        collectorMap.remove();
        collectorMap = null;
    }
    
    setTimeout(() => {
        try {
            collectorMap = L.map('collectorHeatmap').setView([42.6191, 25.3978], 14);
            
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors'
            }).addTo(collectorMap);
            
            displayCollectorBins();
            
            console.log('Collector bin map initialized');
        } catch (error) {
            console.error('Error initializing collector map:', error);
        }
    }, 200);
}

/**
 * CHANGE #12: displayCollectorBins() now uses real API data
 * Location: Collector map display
 * Purpose: Show actual containers with real fill levels
 */
function displayCollectorBins() {
    if (!collectorMap) return;
    
    // Clear existing markers
    collectorMarkers.forEach(marker => {
        try {
            collectorMap.removeLayer(marker);
        } catch (e) {
            console.warn('Error removing marker:', e);
        }
    });
    collectorMarkers = [];
    
    // Display all bins from API data
    containerData.forEach(bin => {
        // Check if bin is collected
        const isCollected = collectedBins.has(bin.id);
        
        // Determine color based on status
        let color, radius;
        if (isCollected) {
            color = '#64748b'; // Gray for collected
            radius = 8;
        } else {
            color = bin.status === 'empty' ? '#10b981' : 
                   bin.status === 'warning' ? '#f59e0b' : '#ef4444';
            radius = bin.status === 'critical' ? 12 : 8;
        }
        
        try {
            const marker = L.circleMarker([bin.lat, bin.lng], {
                radius: radius,
                fillColor: color,
                color: '#fff',
                weight: 2,
                opacity: 1,
                fillOpacity: isCollected ? 0.5 : 0.9
            }).addTo(collectorMap);
            
            marker.bindPopup(`
                <div style="color: #1e293b; font-family: system-ui; padding: 0.8rem; min-width: 220px;">
                    <strong style="font-size: 1.1rem;">Container #${bin.id}</strong>
                    ${isCollected ? '<span style="color: #64748b; font-weight: bold;"> ✅ COLLECTED</span>' : 
                      bin.status === 'critical' ? '<span style="color: #ef4444; font-weight: bold;"> URGENT</span>' : ''}
                    <br>
                    <div style="margin-top: 0.5rem;">
                        <strong style="font-size: 1.3rem;">${bin.fillLevel.toFixed(1)}%</strong> Full
                    </div>
                    <div style="margin-top: 0.5rem; padding: 0.5rem; background: rgba(100,116,139,0.1); border-radius: 6px;">
                        Status: <strong style="color: ${color};">${isCollected ? 'COLLECTED' : bin.status.toUpperCase()}</strong><br>
                        Temperature: ${bin.temperature}°C<br>
                        Container ID: BIN-${String(bin.id).padStart(3, '0')}
                    </div>
                </div>
            `);
            
            collectorMarkers.push(marker);
        } catch (error) {
            console.error('Error adding collector marker:', error);
        }
    });
}

function displayCollectorRoute() {
    if (!collectorMap) {
        showNotification('Please wait for map to load', 'warning');
        return;
    }
    
    const routeBins = containerData
        .filter(bin => bin.status === 'critical' || bin.status === 'warning')
        .sort((a, b) => b.fillLevel - a.fillLevel)
        .slice(0, 20);
    
    const latlngs = routeBins.map(c => [c.lat, c.lng]);
    
    try {
        const polyline = L.polyline(latlngs, {
            color: '#10b981',
            weight: 3,
            opacity: 0.7,
            dashArray: '10, 10'
        }).addTo(collectorMap);
        
        showNotification('Route displayed on map', 'success');
        
        setTimeout(() => {
            try {
                collectorMap.removeLayer(polyline);
            } catch (e) {
                console.warn('Error removing route:', e);
            }
        }, 10000);
    } catch (error) {
        console.error('Error displaying route:', error);
    }
}

function markBinComplete() {
    if (collectorCompleted < 20) {
        // Get a random uncollected bin
        const uncollectedBins = containerData.filter(b => !collectedBins.has(b.id));
        
        if (uncollectedBins.length > 0) {
            const randomBin = uncollectedBins[Math.floor(Math.random() * uncollectedBins.length)];
            collectedBins.add(randomBin.id);
            
            collectorCompleted++;
            updateCollectorProgress();
            
            // Update map to show collected bin
            if (collectorMap) {
                displayCollectorBins();
            }
            
            showNotification(`Container #${randomBin.id} marked as collected! (${collectorCompleted}/20)`, 'success');
        }
    } else {
        showNotification('All bins completed for today!', 'info');
    }
}

function updateCollectorProgress() {
    const progress = (collectorCompleted / 20) * 100;
    
    const el1 = document.getElementById('collectorCompleted');
    const el2 = document.getElementById('collectorProgressBar');
    const el3 = document.getElementById('collectorProgressText');
    const el4 = document.getElementById('collectorProgressPercent');
    
    if (el1) el1.textContent = collectorCompleted;
    if (el2) el2.style.width = `${progress}%`;
    if (el3) el3.textContent = `${collectorCompleted} / 20 bins completed`;
    if (el4) el4.textContent = `${Math.round(progress)}%`;
}
