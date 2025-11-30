// ===========================
// GLOBAL VARIABLES 
// ===========================

// Current user state
let currentUser = null;

const KAZANLAK_BOUNDS = {
    center: [42.6191, 25.3978],
    southWest: [42.55, 25.30],
    northEast: [42.69, 25.50]
};

const kazanlakLatLngBounds = L.latLngBounds(
    KAZANLAK_BOUNDS.southWest,
    KAZANLAK_BOUNDS.northEast
);

// Global data storage
let containerData = [];
let userReports = [];
let sensors = [];

// Collector specific
let collectorCompleted = 0;
let collectorMap = null;
let collectorMarkers = [];
let collectedBins = new Set();

// User specific
let userMap = null;
let userMarkers = [];

// Admin specific
let adminMap = null;
let adminMarkers = [];
let heatmapMap = null;
let adminCharts = {};
const API_BASE_URL = 'https://localhost:7230';

// Route optimization variables (from second script)
let routeControls = { north: null, south: null };
let routeMarkers = { north: [], south: [] };
const TRUCK_CAPACITY = 15000; // 15 m³ in liters
const MIN_FILL_TARGET = 0.90; // 90% minimum fill
const distCache = {}; // Distance cache

// Depot configuration
const depots = {
    north: { id: 'depot-north', lat: 42.6250, lon: 25.3978, name: 'North Depot', fillLevel: 0, zone: 'north' },
    south: { id: 'depot-south', lat: 42.6130, lon: 25.3978, name: 'South Depot', fillLevel: 0, zone: 'south' }
};

// Kazanlak configuration
const kazanlakBounds = {
    centerLat: 42.6191,
    centerLon: 25.3978,
    dividingLine: 42.6191,
    minLat: 42.60,
    maxLat: 42.65,
    minLon: 25.35,
    maxLon: 25.45
};

// ===========================
// AUTHENTICATION SYSTEM
// ===========================

async function checkAuth() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/Auth/verify`, {
            method: 'GET',
            credentials: 'include'
        });

        if (response.ok) {
            const userData = await response.json();
            console.log(userData);
            if (Array.isArray(userData.role)) {
                userData.role = userData.role.length > 0 ? userData.role[0].toLowerCase() : 'user';
            } else {
                userData.role = (userData.role || 'user').toLowerCase();
            }

            currentUser = userData;
            showDashboard(currentUser.role);
        } else {
            showHomePage();
        }
    } catch (error) {
        console.error('Error verifying session:', error);
        showHomePage();
    }
}

function showHomePage() {
    document.getElementById('homePage').classList.add('active');
    document.getElementById('loginScreen').classList.remove('active');
    document.getElementById('registerScreen').classList.remove('active');
    document.getElementById('navbar').style.display = 'none';
    document.getElementById('userDashboard').style.display = 'none';
    document.getElementById('collectorDashboard').style.display = 'none';
    document.getElementById('adminDashboard').style.display = 'none';

    const homeLoginBtn = document.getElementById('homeLoginBtn');
    if (homeLoginBtn) {
        homeLoginBtn.style.display = 'block';
    }
}

function showLoginScreen() {
    document.getElementById('homePage').classList.remove('active');
    document.getElementById('loginScreen').classList.add('active');
    document.getElementById('navbar').style.display = 'none';
    document.getElementById('userDashboard').style.display = 'none';
    document.getElementById('collectorDashboard').style.display = 'none';
    document.getElementById('adminDashboard').style.display = 'none';
}

const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', async function (e) {
        e.preventDefault();

        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;

        try {
            const response = await fetch(`${API_BASE_URL}/api/Auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({
                    email: email,
                    password: password
                })
            });

            if (!response.ok) {
                const errorData = await response.text();
                throw new Error(errorData || 'Login failed');
            }

            await checkAuth();

            showNotification('Login successful!', 'success');

        } catch (error) {
            console.error('Login error:', error);
            showNotification(error.message || 'Login failed. Please try again.', 'warning');
        }
    });
}

const showRegisterLink = document.getElementById('showRegister');
if (showRegisterLink) {
    showRegisterLink.addEventListener('click', function (e) {
        e.preventDefault();
        document.getElementById('loginScreen').classList.remove('active');
        document.getElementById('registerScreen').classList.add('active');
    });
}

const showLoginLink = document.getElementById('showLogin');
if (showLoginLink) {
    showLoginLink.addEventListener('click', function (e) {
        e.preventDefault();
        document.getElementById('registerScreen').classList.remove('active');
        document.getElementById('loginScreen').classList.add('active');
    });
}

const registerForm = document.getElementById('registerForm');
if (registerForm) {
    registerForm.addEventListener('submit', async function (e) {
        e.preventDefault();

        const username = document.getElementById('registerName').value;
        const email = document.getElementById('registerEmail').value;
        const password = document.getElementById('registerPassword').value;
        const confirmPassword = document.getElementById('registerConfirmPassword').value;

        if (password !== confirmPassword) {
            showNotification('Passwords do not match!', 'warning');
            return;
        }

        if (password.length < 6) {
            showNotification('Password must be at least 6 characters!', 'warning');
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/api/Auth/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({
                    username: username,
                    email: email,
                    password: password,
                    confirmPassword: password,
                })
            });

            if (!response.ok) {
                const errorData = await response.text();
                throw new Error(errorData || 'Registration failed');
            }

            showNotification('Account created successfully! Logging you in...', 'success');

            registerForm.reset();
            document.getElementById('registerScreen').classList.remove('active');

            await checkAuth();

        } catch (error) {
            console.error('Registration error:', error);
            showNotification(error.message || 'Registration failed. Please try again.', 'warning');
        }
    });
}

function showDashboard(role) {
    console.log(role);
    document.getElementById('homePage').classList.remove('active');
    document.getElementById('loginScreen').classList.remove('active');

    document.getElementById('navbar').style.display = 'block';

    const userRoleEl = document.getElementById('userRole');
    const userNameEl = document.getElementById('userName');
    if (userRoleEl) userRoleEl.textContent = role.toUpperCase();
    if (userNameEl) userNameEl.textContent = currentUser.name;

    document.getElementById('userDashboard').style.display = 'none';
    document.getElementById('collectorDashboard').style.display = 'none';
    document.getElementById('adminDashboard').style.display = 'none';

    if (role === 'user') {
        document.getElementById('userDashboard').style.display = 'block';
        const floatingBtn = document.getElementById('floatingReportBtn');
        if (floatingBtn) floatingBtn.style.display = 'flex';
        setTimeout(() => initUserDashboard(), 300);
    } else if (role === 'driver') {
        document.getElementById('collectorDashboard').style.display = 'block';
        const floatingBtn = document.getElementById('floatingReportBtn');
        if (floatingBtn) floatingBtn.style.display = 'none';
        setTimeout(() => initCollectorDashboard(), 300);
    } else if (role === 'admin') {
        document.getElementById('adminDashboard').style.display = 'block';
        const floatingBtn = document.getElementById('floatingReportBtn');
        if (floatingBtn) floatingBtn.style.display = 'none';
        const impactSection = document.getElementById('impact');
        impactSection.style.display = "none";
        setTimeout(() => initAdminDashboard(), 300);
    }

    updateNavLinks(role);
}

function updateNavLinks(role) {
    const navLinks = document.getElementById('navLinks');
    if (!navLinks) return;

    navLinks.innerHTML = '';

    if (role === 'user') {
        navLinks.innerHTML = `
            <li><a href="#home">Home</a></li>
            <li><a href="#" id="navReportIssue">Report Issue</a></li>
            <li><a href="#" id="navMyReports">My Reports</a></li>
            <li><a href="#" id="navNearbyBins">Zone Heatmap</a></li>
        `;
    } else if (role === 'collector') {
        navLinks.innerHTML = `
            <li><a href="#home">Home</a></li>
            <li><a href="#" id="navTodayRoute">Today's Route</a></li>
            <li><a href="#" id="navHeatmap">Bin Map</a></li>
        `;
    } else if (role === 'admin') {
        navLinks.innerHTML = `
            <li><a href="#home">Home</a></li>
            <li><a href="#dashboard">Dashboard</a></li>
            <li><a href="#map">Live Map</a></li>
            <li><a href="#analytics">Analytics</a></li>
        `;
    }
}

const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', async function () {
        try {
            await fetch(`${API_BASE_URL}/api/Auth/logout`, {
                method: 'POST',
                credentials: 'include'
            });

            currentUser = null;
            collectedBins.clear();
            showNotification('Logged out successfully', 'info');

            setTimeout(() => {
                window.location.reload();
            }, 500);

        } catch (error) {
            console.error('Logout error:', error);
            currentUser = null;
            collectedBins.clear();

            setTimeout(() => {
                window.location.reload();
            }, 500);
        }
    });
}

// ===========================
// NOTIFICATION SYSTEM
// ===========================
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 100px;
        right: 20px;
        padding: 1rem 1.5rem;
        background: ${type === 'success' ? '#10b981' : type === 'warning' ? '#f59e0b' : '#3b82f6'};
        color: white;
        border-radius: 12px;
        box-shadow: 0 10px 40px rgba(0,0,0,0.3);
        z-index: 10000;
        animation: slideInRight 0.5s ease-out;
        max-width: 300px;
        font-weight: 500;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.5s ease-out';
        setTimeout(() => notification.remove(), 500);
    }, 3000);
}

const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from { opacity: 0; transform: translateX(100px); }
        to { opacity: 1; transform: translateX(0); }
    }
    @keyframes slideOutRight {
        from { opacity: 1; transform: translateX(0); }
        to { opacity: 0; transform: translateX(100px); }
    }
    @keyframes slideIn {
        from { opacity: 0; transform: translateX(-20px); }
        to { opacity: 1; transform: translateX(0); }
    }
`;
document.head.appendChild(style);

// ===========================
// SENSOR SIMULATION CLASSES (MOCK)
// ===========================

class UltrasonicSensor {
    constructor(containerId, containerHeight = 120) {
        this.containerId = containerId;
        this.containerHeight = containerHeight;
        this.currentFillLevel = Math.random() * 100;
    }

    measureDistance() {
        const fillHeight = (this.currentFillLevel / 100) * this.containerHeight;
        const distance = this.containerHeight - fillHeight;
        const noise = (Math.random() - 0.5) * 2;
        const measuredDistance = distance + noise;
        return Math.max(5, Math.min(measuredDistance, this.containerHeight));
    }

    calculateFillLevel() {
        const distance = this.measureDistance();
        const fillHeight = this.containerHeight - distance;
        const fillPercentage = (fillHeight / this.containerHeight) * 100;
        return Math.max(0, Math.min(100, fillPercentage));
    }

    simulateTrashAccumulation(increment = 5) {
        // realistic increase per cycle: 0.1 to 1.5%
        const increase = 0.1 + Math.random() * 1.4;

        this.currentFillLevel = Math.min(100, this.currentFillLevel + increase);
        return this.currentFillLevel;
    }


    getSensorData() {
        const fillLevel = this.calculateFillLevel();
        const distance = this.measureDistance();

        return {
            containerId: this.containerId,
            timestamp: new Date().toISOString(),
            fillLevel: Math.round(fillLevel * 10) / 10,
            distanceFromSensor: Math.round(distance * 10) / 10,
            status: fillLevel < 50 ? 'empty' : fillLevel < 80 ? 'warning' : 'critical',
            sensorHealth: 'operational',
            batteryLevel: 85 + Math.random() * 15
        };
    }
}

class TemperatureSensor {
    constructor(containerId) {
        this.containerId = containerId;
        this.baseTemp = 20 + Math.random() * 5;
    }

    measureTemperature() {
        const fluctuation = (Math.random() - 0.5) * 2;
        let temp = this.baseTemp + fluctuation;

        if (Math.random() < 0.0001) {
            temp = 50 + Math.random() * 30;
            console.warn(`🔥 FIRE DETECTED in ${this.containerId}!`);
        }

        const hour = new Date().getHours();
        if (hour >= 12 && hour <= 16) {
            temp += 3;
        }

        return Math.round(temp * 10) / 10;
    }

    getSensorData() {
        const temp = this.measureTemperature();

        return {
            containerId: this.containerId,
            timestamp: new Date().toISOString(),
            temperature: temp,
            unit: 'celsius',
            status: temp > 45 ? 'critical' : temp > 35 ? 'warning' : 'normal'
        };
    }
}

class SmartBinSensor {
    constructor(containerId, lat, lng, zone, containerHeight = 120) {
        this.containerId = containerId;
        this.location = { lat, lng };
        this.zone = zone;
        this.ultrasonicSensor = new UltrasonicSensor(containerId, containerHeight);
        this.tempSensor = new TemperatureSensor(containerId);
    }

    getCompleteReading() {
        const fillData = this.ultrasonicSensor.getSensorData();
        const tempData = this.tempSensor.getSensorData();

        return {
            containerId: this.containerId,
            id: parseInt(this.containerId.split('-')[1]),
            location: this.location,
            lat: this.location.lat,
            lng: this.location.lng,
            lon: this.location.lng, // Add lon for route algorithm compatibility
            zone: this.zone,
            timestamp: new Date().toISOString(),
            fillLevel: fillData.fillLevel,
            distanceFromSensor: fillData.distanceFromSensor,
            temperature: tempData.temperature,
            status: fillData.status,
            fireRisk: tempData.status === 'critical',
            batteryLevel: fillData.batteryLevel,
            signalStrength: -50 - Math.random() * 40,
            sensorHealth: 'operational',
            capacity: 1100,
            address: `Container #${parseInt(this.containerId.split('-')[1])}`
        };
    }

    update() {
        this.ultrasonicSensor.simulateTrashAccumulation(5);
        return this.getCompleteReading();
    }
}

async function loadContainersFromBackend() {
    try {
        // 1. Load container POSITIONS from local JSON
        console.log('📂 Loading container positions from containers.json...');
        const jsonResponse = await fetch('containers.json');
        if (!jsonResponse.ok) throw new Error('containers.json not found');
        
        const localContainers = await jsonResponse.json();
        console.log(`✅ Loaded ${localContainers.length} container positions from local JSON`);
        
        // 2. Try to get SENSOR DATA from backend
        try {
            const backendResponse = await fetch(`${API_BASE_URL}/api/TrashContainer/api/containers`, {
                method: 'GET',
                credentials: 'include'
            });

            if (backendResponse.ok) {
                const backendData = await backendResponse.json();
                console.log(`📡 Received sensor data for ${backendData.length} containers from backend`);
                
                // 3. MERGE: Local positions + Backend sensor data
                containerData = localContainers.map(local => {
                    const backend = backendData.find(b => b.Id === local.id);
                    
                    return {
                        // FROM LOCAL JSON (positions - these NEVER change)
                        id: local.id,
                        containerId: `BIN-${String(local.id).padStart(3, '0')}`,
                        lat: local.lat,
                        lng: local.lon,  // JSON uses 'lon', frontend uses 'lng'
                        lon: local.lon,
                        zone: local.zone,
                        capacity: local.capacity,
                        address: local.address,
                        
                        // FROM BACKEND (sensor data - changes every 20s)
                        fillLevel: backend ? backend.FillPercentage : local.fillLevel,
                        temperature: backend ? backend.Temperature : 20 + Math.random() * 5,
                        batteryLevel: backend ? backend.BatteryPercentage : 85 + Math.random() * 15,
                        
                        // CALCULATED
                        status: backend 
                            ? (backend.FillPercentage < 50 ? 'empty' : backend.FillPercentage < 80 ? 'warning' : 'critical')
                            : (local.fillLevel < 50 ? 'empty' : local.fillLevel < 80 ? 'warning' : 'critical'),
                        fireRisk: backend ? backend.Temperature > 45 : false,
                        distanceFromSensor: 0,
                        signalStrength: -50 - Math.random() * 40,
                        sensorHealth: 'operational',
                        timestamp: new Date().toISOString()
                    };
                });
                
                console.log(`✅ HYBRID MODE: ${containerData.length} containers (positions: local, sensors: backend)`);
            } else {
                throw new Error('Backend unavailable');
            }
            
        } catch (backendError) {
            console.warn('⚠️ Backend unavailable, using local data only:', backendError.message);
            
            // Use local JSON data as-is (add missing fields)
            containerData = localContainers.map(local => ({
                id: local.id,
                containerId: `BIN-${String(local.id).padStart(3, '0')}`,
                lat: local.lat,
                lng: local.lon,
                lon: local.lon,
                zone: local.zone,
                capacity: local.capacity,
                address: local.address,
                fillLevel: local.fillLevel,
                temperature: 20 + Math.random() * 5,
                batteryLevel: 85 + Math.random() * 15,
                status: local.fillLevel < 50 ? 'empty' : local.fillLevel < 80 ? 'warning' : 'critical',
                fireRisk: false,
                distanceFromSensor: 0,
                signalStrength: -50 - Math.random() * 40,
                sensorHealth: 'operational',
                timestamp: new Date().toISOString()
            }));
            
            console.log(`✅ LOCAL MODE: ${containerData.length} containers (all data from JSON)`);
        }
        
        // 4. Initialize sensors from merged data
        sensors = containerData.map(c => 
            new SmartBinSensor(c.containerId, c.lat, c.lng, c.zone)
        );

        updateDashboardStats();
        if (adminMap) displayAdminBins('all');
        if (collectorMap) displayCollectorBins();

    } catch (error) {
        console.error('❌ Failed to load containers.json:', error);
        console.log('⚠️ Falling back to random sensor generation...');
        initializeSensorsAsFallback();
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
// ===========================
// LOAD CONTAINERS FROM JSON
// ===========================

async function updateSensorsWithBackend() {
    try {
        // 1. Update sensor simulation locally
        containerData = sensors.map(sensor => sensor.update());

        // 2. Try to send to backend
        try {
            const response = await fetch(`${API_BASE_URL}/api/TrashContainer/api/AddTrash`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(containerData.map(c => ({
                    Id: c.id,
                    Capacity: c.capacity / 1000,           // Convert liters to m³
                    Percentage: Math.round(c.fillLevel),
                    IsFilled: c.fillLevel >= 80,
                    LocationX: c.lat,                      // Send positions (backend needs them)
                    LocationY: c.lon,                      // Use 'lon' field
                    Temperature: Math.round(c.temperature),
                    BatteryPercentage: Math.round(c.batteryLevel),
                    AreaId: c.zone === 'north' ? 1 : 2
                })))
            });

            if (!response.ok) {
                throw new Error(`Backend error: ${response.status}`);
            }

            // 3. Get updated sensor data from backend
            const getResponse = await fetch(`${API_BASE_URL}/api/TrashContainer/api/containers`, {
                method: 'GET',
                credentials: 'include'
            });

            if (getResponse.ok) {
                const backendData = await getResponse.json();

                // 4. UPDATE ONLY sensor values, KEEP positions from containerData
                containerData = containerData.map(local => {
                    const backend = backendData.find(b => b.Id === local.id);
                    
                    if (backend) {
                        return {
                            ...local,  // Keep ALL local data (positions, address, etc)
                            // Update ONLY sensor values
                            fillLevel: backend.FillPercentage,
                            temperature: backend.Temperature,
                            batteryLevel: backend.BatteryPercentage,
                            status: backend.FillPercentage < 50 ? 'empty' : backend.FillPercentage < 80 ? 'warning' : 'critical',
                            fireRisk: backend.Temperature > 45,
                            timestamp: new Date().toISOString()
                        };
                    }
                    return local;  // No backend data, keep local
                });

                console.log('✅ Backend sync successful (sensor data updated, positions unchanged)');
            }

        } catch (backendError) {
            console.warn('⚠️ Backend unavailable, using local sensor simulation:', backendError.message);
            // containerData already updated from local sensors above
        }

        // 5. Update UI
        updateDashboardStats();
        if (adminMap) displayAdminBins('all');
        if (collectorMap) displayCollectorBins();

    } catch (error) {
        console.error('❌ Error in sensor update:', error);
    }
}

// Fallback sensor initialization if JSON loading fails
function initializeSensorsAsFallback() {
    sensors = [];
    containerData = [];

    const centerLat = kazanlakBounds.centerLat;
    const centerLng = kazanlakBounds.centerLon;
    const dividingLine = kazanlakBounds.dividingLine;

    for (let i = 0; i < 60; i++) {
        const lat = centerLat + (Math.random() - 0.5) * 0.05;
        const lng = centerLng + (Math.random() - 0.5) * 0.05;

        const zone = lat >= dividingLine ? 'north' : 'south';

        const sensor = new SmartBinSensor(`BIN-${String(i + 1).padStart(3, '0')}`, lat, lng, zone);
        sensors.push(sensor);

        const reading = sensor.getCompleteReading();
        containerData.push(reading);
    }

    console.log('✅ Fallback sensors initialized:', containerData.length);

    const northCount = containerData.filter(c => c.zone === 'north').length;
    const southCount = containerData.filter(c => c.zone === 'south').length;
    console.log(`   📍 North zone: ${northCount} containers`);
    console.log(`   📍 South zone: ${southCount} containers`);

    updateDashboardStats();
}

function updateAllSensors() {
    containerData = sensors.map(sensor => sensor.update());
    updateDashboardStats();
}

// ===========================
// ROUTE OPTIMIZATION ALGORITHM (FROM SECOND SCRIPT)
// ===========================

function calculateDistance(p1, p2) {
    const R = 6371;
    const dLat = (p2.lat - p1.lat) * Math.PI / 180;
    const dLon = (p2.lon - p1.lon) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(p1.lat * Math.PI / 180) * Math.cos(p2.lat * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

function getCacheKey(p1, p2) {
    return `${p1.lat.toFixed(5)},${p1.lon.toFixed(5)}-${p2.lat.toFixed(5)},${p2.lon.toFixed(5)}`;
}

async function getRealDistanceFast(p1, p2) {
    const key = getCacheKey(p1, p2);
    if (distCache[key]) return distCache[key];
    const airDist = calculateDistance(p1, p2);
    const realDist = airDist * 1.3;
    const time = realDist / 0.5;
    const result = { distance: realDist, time: time, valid: true };
    distCache[key] = result;
    return result;
}

function categorizeContainer(fl) {
    if (fl >= 70) return 'CRITICAL';
    if (fl >= 30) return 'MEDIUM';
    if (fl >= 10) return 'LOW';
    return 'SKIP';
}

function getTruckMode(fillPct) {
    if (fillPct < 60) return 'HUNTING';
    if (fillPct < 85) return 'COLLECTING';
    return 'TOPPING_OFF';
}

function countNearbyContainers(cn, all, radius) {
    let cnt = 0;
    for (let i = 0; i < all.length && cnt < 3; i++) {
        if (all[i].id !== cn.id) {
            const d = calculateDistance(cn, all[i]);
            if (d <= radius) cnt++;
        }
    }
    return cnt;
}

function calculateFastEfficiency(cn, cr, tv, rm, distData) {
    const cat = categorizeContainer(cn.fillLevel);
    const mode = getTruckMode((tv / TRUCK_CAPACITY) * 100);
    const vol = cn.capacity * (cn.fillLevel / 100);
    const remaining = TRUCK_CAPACITY - tv;

    if (vol > remaining) return { efficiency: -Infinity };

    let dist = distData.distance;
    if (dist < 0.01) dist = 0.01;

    let pri = 1.0;
    if (cat === 'CRITICAL') pri = 3.0;
    else if (cat === 'MEDIUM') pri = 1.5;
    else if (cat === 'LOW') pri = 0.5;
    else return { efficiency: -Infinity };

    let baseEff = (pri * vol) / dist;
    let bonus = 0;

    if (mode === 'HUNTING') {
        if (cat === 'CRITICAL') bonus += vol * 2;
        else if (cat === 'MEDIUM') bonus += vol * 0.5;
        if (vol < 200) bonus -= 500;
    } else if (mode === 'COLLECTING') {
        if (cat === 'CRITICAL') bonus += vol * 1.5;
        else if (cat === 'MEDIUM' && vol > 300) bonus += vol * 0.8;
        if (dist < 0.3) bonus += 300;
    } else if (mode === 'TOPPING_OFF') {
        if (vol <= remaining && vol > remaining * 0.5) bonus += vol * 3;
        if (dist < 0.2) bonus += 500;
        if (cat === 'LOW' && dist < 0.3) bonus += vol * 2;
    }

    if (dist < 0.3) {
        const nearby = countNearbyContainers(cn, rm, 0.5);
        if (nearby >= 2) bonus += nearby * 100;
    }

    return {
        efficiency: baseEff + bonus,
        distance: dist,
        time: distData.time || 0,
        volume: vol,
        category: cat,
        mode: mode
    };
}

async function getFastContextRoute(cc, depot) {
    console.log('ULTRA-FAST Dynamic Context-Aware Algorithm...');
    console.log(`Available containers: ${cc.length}`);

    const route = [depot];
    const remaining = [...cc];
    let current = depot;
    let totalDistance = 0, totalTime = 0, totalVolume = 0, step = 0;

    const distMatrix = {};
    for (let i = 0; i < cc.length; i++) {
        for (let j = 0; j < cc.length; j++) {
            if (i !== j) {
                const key = getCacheKey(cc[i], cc[j]);
                if (!distCache[key]) distCache[key] = await getRealDistanceFast(cc[i], cc[j]);
            }
        }
    }
    for (let i = 0; i < remaining.length; i++) {
        const key = getCacheKey(current, remaining[i]);
        distMatrix[key] = await getRealDistanceFast(current, remaining[i]);
    }

    const remainingSet = new Set(remaining.map(x => x.id));

    while (remainingSet.size > 0 && totalVolume < TRUCK_CAPACITY) {
        step++;
        const fillPct = (totalVolume / TRUCK_CAPACITY) * 100;
        if (fillPct >= MIN_FILL_TARGET * 100) {
            const nearDepot = remaining.filter(x => remainingSet.has(x.id) && distMatrix[getCacheKey(current, x)]?.distance < 0.5);
            if (nearDepot.length === 0) break;
        }

        const mode = getTruckMode(fillPct);
        let bestContainer = null, bestEff = -Infinity, bestData = null;

        let candidates = remaining.filter(x => remainingSet.has(x.id));
        if (mode === 'TOPPING_OFF') {
            const remainingCapacity = TRUCK_CAPACITY - totalVolume;
            candidates = candidates.filter(x => {
                const vol = x.capacity * (x.fillLevel / 100);
                return vol <= remainingCapacity && vol > remainingCapacity * 0.3;
            });
        }

        for (const cand of candidates) {
            const key = getCacheKey(current, cand);
            const distData = distMatrix[key];
            if (!distData) continue;
            const eff = calculateFastEfficiency(cand, current, totalVolume, remaining, distData);
            if (eff.efficiency > bestEff) {
                bestEff = eff.efficiency;
                bestContainer = cand;
                bestData = eff;
            }
        }

        if (!bestContainer || bestEff === -Infinity) break;

        route.push(bestContainer);
        totalDistance += bestData.distance;
        totalTime += bestData.time;
        totalVolume += bestData.volume;
        remainingSet.delete(bestContainer.id);
        current = bestContainer;

        for (const r of remaining) {
            if (remainingSet.has(r.id)) {
                const newKey = getCacheKey(current, r);
                if (!distCache[newKey]) distCache[newKey] = await getRealDistanceFast(current, r);
                distMatrix[newKey] = distCache[newKey];
            }
        }

        if (fillPct >= 95) break;
    }

    const returnDist = await getRealDistanceFast(current, depot);
    route.push(depot);
    totalDistance += returnDist.distance;
    totalTime += returnDist.time || 0;

    const fillPct = (totalVolume / TRUCK_CAPACITY * 100).toFixed(1);

    console.log(`Route ready! Steps: ${step} | Distance: ${totalDistance.toFixed(2)} km | Time: ${totalTime.toFixed(1)} min | Fill: ${fillPct}%`);

    return {
        route: route,
        totalDistance: totalDistance,
        totalTime: totalTime,
        totalVolume: totalVolume,
        fillPercent: parseFloat(fillPct),
        containersCount: route.length - 2
    };
}

// ===========================
// GENERATE AND VISUALIZE ROUTES
// NOTE: This function needs to be called from your HTML buttons
// Example HTML button: <button onclick="generateOptimizedRoute('north')">Generate North Route</button>
// ===========================

async function generateOptimizedRoute(zone) {
    // Check if Leaflet Routing Machine is loaded
    if (typeof L === 'undefined' || typeof L.Routing === 'undefined') {
        const errorMsg = 'Leaflet Routing Machine not loaded!';
        showNotification(errorMsg, 'warning');
        console.error('❌ ' + errorMsg);
        console.error('📚 Add these to your HTML <head>:');
        console.error('   <link rel="stylesheet" href="https://unpkg.com/leaflet-routing-machine@latest/dist/leaflet-routing-machine.css" />');
        console.error('   <script src="https://unpkg.com/leaflet-routing-machine@latest/dist/leaflet-routing-machine.js"></script>');
        console.error('📄 See REQUIRED-LIBRARIES.md for complete instructions');
        return;
    }

    if (zone === 'both') {
        await generateOptimizedRoute('north');
        setTimeout(() => generateOptimizedRoute('south'), 500);
        return;
    }

    // Clear existing route
    if (routeControls[zone]) {
        try {
            if (collectorMap) collectorMap.removeControl(routeControls[zone]);
            if (adminMap) adminMap.removeControl(routeControls[zone]);
        } catch (e) {
            console.warn('Error removing route control:', e);
        }
        routeControls[zone] = null;
    }
    routeMarkers[zone].forEach(mr => {
        try {
            if (collectorMap) collectorMap.removeLayer(mr);
            if (adminMap) adminMap.removeLayer(mr);
        } catch (e) {
            console.warn('Error removing marker:', e);
        }
    });
    routeMarkers[zone] = [];

    const containers = containerData.filter(cn => cn.zone === zone);
    if (containers.length === 0) {
        showNotification(`No containers in ${zone} zone!`, 'warning');
        return;
    }

    showNotification(`Optimizing ${zone} route...`, 'info');

    const depot = depots[zone];
    const start = Date.now();
    const result = await getFastContextRoute(containers, depot);
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);

    const waypoints = result.route.map(p => L.latLng(p.lat, p.lon || p.lng));
    const color = zone === 'north' ? '#dc3545' : '#28a745';

    // Determine which map to use
    const targetMap = collectorMap || adminMap;

    if (!targetMap) {
        showNotification('Map not initialized', 'warning');
        return;
    }

    routeControls[zone] = L.Routing.control({
        waypoints,
        routeWhileDragging: false,
        addWaypoints: false,
        draggableWaypoints: false,
        fitSelectedRoutes: false,
        showAlternatives: false,
        lineOptions: { styles: [{ color, opacity: 0.7, weight: 4 }] },
        createMarker: () => null
    }).addTo(targetMap);

    routeControls[zone].on('routesfound', function (e) {
        const tdk = result.totalDistance.toFixed(2);
        const ttm = result.totalTime.toFixed(1);
        const tth = (result.totalTime / 60).toFixed(2);
        const tvol = (result.totalVolume / 1000).toFixed(1);
        const tfill = result.fillPercent;
        const cir = result.containersCount;

        console.log(`📏 ========== Route ${zone.toUpperCase()} ==========`);
        console.log(`   ⚡ Fast Context-Aware Algorithm (${elapsed}s)`);
        console.log(`   🛣️  Distance: ${tdk} km`);
        console.log(`   ⏱️  Time: ${ttm} min`);
        console.log(`   📦 Capacity: ${tvol}/${TRUCK_CAPACITY / 1000}m³ (${tfill}%)`);
        console.log(`   🗑️  Containers: ${cir}`);
        console.log('================================================');

        // Add route stop markers
        result.route.forEach(function (p, ix) {
            if (p.id !== depot.id) {
                const cat = categorizeContainer(p.fillLevel);
                const catColor = cat === 'CRITICAL' ? '#dc3545' :
                    cat === 'MEDIUM' ? '#ffc107' :
                        cat === 'LOW' ? '#28a745' : '#999';

                const marker = L.marker([p.lat, p.lon || p.lng], {
                    icon: L.divIcon({
                        className: 'route-number',
                        html: `<div style="background:${color};color:white;width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:bold;font-size:14px;border:3px solid ${catColor};box-shadow:0 3px 8px rgba(0,0,0,0.4);">${ix}</div>`,
                        iconSize: [28, 28],
                        iconAnchor: [14, 14]
                    }),
                    zIndexOffset: 1000
                }).addTo(targetMap);

                const pvol = (p.capacity * (p.fillLevel / 100) / 1000).toFixed(2);
                marker.bindPopup(`<b>🚛 Stop #${ix}</b><br>Container: <b>#${p.id}</b><br>Category: <b>${cat}</b><br>Fill: <b>${p.fillLevel}%</b><br>Volume: <b>${pvol}m³</b><br>Address: ${p.address}`);
                routeMarkers[zone].push(marker);
            }
        });

        // Info panel
        const zoneName = zone === 'north' ? 'North' : 'South';
        const capColor = tfill >= 90 ? '#28a745' : tfill >= 75 ? '#ffc107' : '#dc3545';

        const infoHTML = `<div style="margin-top:1.5rem;background:var(--glass-bg);border:1px solid var(--glass-border);padding:1.5rem 2rem;border-radius:16px;border-left:5px solid ${color};" id="routeInfo${zone}">
            <h4 style="margin:0 0 1rem 0;color:${color};font-size:1.2rem;display:flex;align-items:center;gap:0.5rem;">
                ${zone === 'north' ? '🔴' : '🟢'} ${zoneName} Zone Route
                <span style="background:linear-gradient(135deg,#f093fb,#f5576c);color:white;padding:0.2rem 0.8rem;border-radius:10px;font-size:0.75rem;margin-left:auto;">⚡ ${elapsed}s</span>
            </h4>
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:1rem;color:var(--text-primary);">
                <div>
                    <div style="color:var(--text-muted);margin-bottom:0.3rem;font-size:0.9rem;">🛣️ Distance</div>
                    <div style="color:${color};font-weight:bold;font-size:1.5rem;">${tdk} km</div>
                </div>
                <div>
                    <div style="color:var(--text-muted);margin-bottom:0.3rem;font-size:0.9rem;">⏱️ Time</div>
                    <div style="color:${color};font-weight:bold;font-size:1.5rem;">${ttm} min</div>
                    <div style="color:var(--text-muted);font-size:0.8rem;">${tth} hours</div>
                </div>
                <div>
                    <div style="color:var(--text-muted);margin-bottom:0.3rem;font-size:0.9rem;">📦 Capacity</div>
                    <div style="color:${capColor};font-weight:bold;font-size:1.5rem;">${tvol}/15m³</div>
                    <div style="background:rgba(255,255,255,0.1);height:8px;border-radius:4px;overflow:hidden;margin-top:0.5rem;">
                        <div style="background:${capColor};width:${tfill}%;height:100%;transition:width 0.3s;"></div>
                    </div>
                    <div style="color:var(--text-muted);font-size:0.8rem;margin-top:0.3rem;">${tfill}% full</div>
                </div>
                <div>
                    <div style="color:var(--text-muted);margin-bottom:0.3rem;font-size:0.9rem;">🗑️ Containers</div>
                    <div style="color:${color};font-weight:bold;font-size:1.5rem;">${cir}</div>
                </div>
                <div>
                    <div style="color:var(--text-muted);margin-bottom:0.3rem;font-size:0.9rem;">💰 Efficiency</div>
                    <div style="color:${color};font-weight:bold;font-size:1.5rem;">${(cir / result.totalDistance).toFixed(1)}</div>
                    <div style="color:var(--text-muted);font-size:0.8rem;">bins per km</div>
                </div>
                <div>
                    <div style="color:var(--text-muted);margin-bottom:0.3rem;font-size:0.9rem;">🎯 Algorithm</div>
                    <div style="font-size:0.75rem;color:var(--text-secondary);line-height:1.4;">
                        HUNTING→<br>COLLECTING→<br>TOPPING_OFF
                    </div>
                </div>
            </div>
        </div>`;

        const oldInfo = document.getElementById('routeInfo' + zone);
        if (oldInfo) oldInfo.remove();

        // Insert after the map wrapper
        const mapWrapper = targetMap.getContainer().closest('.map-wrapper');
        if (mapWrapper && mapWrapper.parentNode) {
            mapWrapper.insertAdjacentHTML('afterend', infoHTML);
        } else {
            // Fallback
            targetMap.getContainer().parentNode.insertAdjacentHTML('afterend', infoHTML);
        }

        const perfMsg = tfill >= 90 ? '🏆 EXCELLENT result!' :
            tfill >= 75 ? '✅ Good result' :
                tfill >= 60 ? '⚠️ Average result' : '❌ Low result';

        showNotification(`${perfMsg}\n\n${zoneName} Zone Route:\n\n⚡ Ultra-fast AI (${elapsed}s)\n🛣️ Distance: ${tdk} km\n⏱️ Time: ${ttm} min (${tth} h)\n📦 Capacity: ${tvol}/15m³ (${tfill}%)\n🗑️ Containers: ${cir} (all categories)\n💰 Efficiency: ${(cir / result.totalDistance).toFixed(1)} bins/km\n\n✓ Passes through CRITICAL, MEDIUM and LOW!`, 'success');
    });

    routeControls[zone].on('routingerror', e => {
        console.error('Route error:', e);
        showNotification('Error visualizing route!', 'warning');
    });
}

// Global function to clear routes
window.generateOptimizedRoute = generateOptimizedRoute;

function clearOptimizedRoutes() {
    ['north', 'south'].forEach(z => {
        if (routeControls[z]) {
            if (collectorMap) collectorMap.removeControl(routeControls[z]);
            if (adminMap) adminMap.removeControl(routeControls[z]);
            routeControls[z] = null;
        }
        routeMarkers[z].forEach(mr => {
            try {
                if (collectorMap) collectorMap.removeLayer(mr);
                if (adminMap) adminMap.removeLayer(mr);
            } catch (e) {
                console.warn('Error removing marker:', e);
            }
        });
        routeMarkers[z] = [];
        const info = document.getElementById('routeInfo' + z);
        if (info) info.remove();
    });
    showNotification('Routes cleared', 'info');
}

window.clearOptimizedRoutes = clearOptimizedRoutes;

// ===========================
// DASHBOARD STATS
// ===========================

function updateDashboardStats() {
    const empty = containerData.filter(c => c.status === 'empty').length;
    const warning = containerData.filter(c => c.status === 'warning').length;
    const critical = containerData.filter(c => c.status === 'critical').length;
    const avgTemp = Math.round(containerData.reduce((sum, c) => sum + c.temperature, 0) / containerData.length);

    const elements = {
        adminEmptyBins: empty,
        adminWarningBins: warning,
        adminCriticalBins: critical,
        avgTemp: avgTemp + '°C',
        filterEmpty: empty,
        filterWarning: warning,
        filterCritical: critical,
        collectorCriticalBins: critical,
        collectorWarningBins: warning,
        heroTotalBins: containerData.length
    };

    Object.keys(elements).forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = elements[id];
    });
}

async function loadSavedReports() {
    if (!currentUser) return;

    try {
        const response = await fetch('/api/reports/user', {
            method: 'GET',
            credentials: 'include'
        });

        if (response.ok) {
            userReports = await response.json();
        }
    } catch (error) {
        console.error('Error loading reports:', error);
        userReports = [];
    }
}

// ===========================
// MODAL SYSTEM & REPORTS
// ===========================

function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active');
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
    }
}

document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.remove('active');
        }
    });
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal.active').forEach(modal => {
            modal.classList.remove('active');
        });
    }
});

const reportModal = document.getElementById('reportModal');
const closeReportModal = document.getElementById('closeReportModal');
const floatingReportBtn = document.getElementById('floatingReportBtn');

if (closeReportModal) {
    closeReportModal.addEventListener('click', () => {
        reportModal.classList.remove('active');
    });
}

if (floatingReportBtn) {
    floatingReportBtn.addEventListener('click', () => {
        reportModal.classList.add('active');
    });
}

const reportForm = document.getElementById('reportForm');
if (reportForm) {
    reportForm.addEventListener('submit', async function (e) {
        e.preventDefault();

        const reportType = document.getElementById('reportType').value;
        const reportLocation = document.getElementById('reportLocation').value;
        const reportDescription = document.getElementById('reportDescription').value;

        const newReport = {
            type: reportType,
            location: reportLocation,
            description: reportDescription,
            status: 'pending'
        };

        try {
            const response = await fetch('/api/reports', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify(newReport)
            });

            if (!response.ok) {
                throw new Error('Failed to submit report');
            }

            const savedReport = await response.json();
            userReports.push(savedReport);

            showNotification('Report submitted successfully!', 'success');
            reportForm.reset();
            reportModal.classList.remove('active');

            if (currentUser && currentUser.role === 'user') {
                updateUserReportsList();
                updateUserStats();
            }

            if (currentUser && currentUser.role === 'admin') {
                loadAdminReports();
            }

        } catch (error) {
            console.error('Error submitting report:', error);
            showNotification('Failed to submit report. Please try again.', 'warning');
        }
    });
}

function getReportIcon(type) {
    const icons = {
        overflow: '🔴',
        missing: '❌',
        damaged: '⚠️',
        garbage: '🗑️',
        smell: '💨',
        other: '📝'
    };
    return icons[type] || '📝';
}

function getReportTypeLabel(type) {
    const labels = {
        overflow: 'Container Overflow',
        missing: 'Missing Container',
        damaged: 'Damaged Container',
        garbage: 'Garbage Outside Container',
        smell: 'Bad Smell',
        other: 'Other Issue'
    };
    return labels[type] || 'Issue Report';
}

// ===========================
// NAVIGATION EVENT HANDLERS
// ===========================
document.addEventListener('click', (e) => {
    if (e.target.id === 'navReportIssue') {
        e.preventDefault();
        openModal('reportModal');
    }

    if (e.target.id === 'navMyReports') {
        e.preventDefault();
        toggleSection('myReportsSection');
        updateUserReportsList();
    }

    if (e.target.id === 'navNearbyBins') {
        e.preventDefault();
        toggleSection('nearbyBinsSection');
        initUserMap();
    }

    if (e.target.id === 'navTodayRoute') {
        e.preventDefault();
        const routeSection = document.getElementById('collectorRouteSection');
        if (routeSection) routeSection.scrollIntoView({ behavior: 'smooth' });
    }

    if (e.target.id === 'navHeatmap') {
        e.preventDefault();
        const heatmapSection = document.getElementById('collectorHeatmapSection');
        if (heatmapSection) heatmapSection.scrollIntoView({ behavior: 'smooth' });
    }
});

document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        const href = this.getAttribute('href');
        if (href === '#') return;

        e.preventDefault();
        const target = document.querySelector(href);
        if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    });
});

const mobileMenuBtn = document.getElementById('mobileMenuBtn');
const navLinks2 = document.getElementById('navLinks');

if (mobileMenuBtn) {
    mobileMenuBtn.addEventListener('click', () => {
        mobileMenuBtn.classList.toggle('active');
        if (navLinks2) {
            navLinks2.style.display = navLinks2.style.display === 'flex' ? 'none' : 'flex';
        }
    });
}

// ===========================
// USER DASHBOARD
// ===========================

function initUserDashboard() {
    console.log('📱 Initializing User Dashboard');

    updateUserStats();

    const buttons = {
        'userReportBtn': () => openModal('reportModal'),
        'userQuickReport': () => openModal('reportModal'),
        'viewMyReportsBtn': () => {
            toggleUserSection('myReportsSection');
            updateUserReportsList();
        },
        'viewNearbyBinsBtn': () => {
            toggleUserSection('nearbyBinsSection');
            setTimeout(() => initUserMap(), 100);
        },
        'userViewMap': () => {
            toggleUserSection('nearbyBinsSection');
            setTimeout(() => initUserMap(), 100);
        },
        'viewCommunityStatsBtn': () => {
            toggleUserSection('communityStatsSection');
            updateCommunityStats();
        }
    };

    Object.keys(buttons).forEach(btnId => {
        const btn = document.getElementById(btnId);
        if (btn) {
            const newBtn = btn.cloneNode(true);
            btn.parentNode.replaceChild(newBtn, btn);
            newBtn.addEventListener('click', buttons[btnId]);
        }
    });
}

function toggleUserSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (section) {
        const isVisible = section.style.display !== 'none';
        document.querySelectorAll('.reports-section, .map-section, .community-stats-section').forEach(s => {
            s.style.display = 'none';
        });
        section.style.display = isVisible ? 'none' : 'block';
    }
}

function updateUserStats() {
    if (!currentUser) return;

    const userReportsFiltered = userReports.filter(r => r.userId === currentUser.id);
    const totalReports = userReportsFiltered.length;
    const resolvedReports = userReportsFiltered.filter(r => r.status === 'resolved').length;
    const pendingReports = userReportsFiltered.filter(r => r.status === 'pending').length;

    const el1 = document.getElementById('userTotalReports');
    const el2 = document.getElementById('userResolvedReports');
    const el3 = document.getElementById('userPendingReports');

    if (el1) el1.textContent = totalReports;
    if (el2) el2.textContent = resolvedReports;
    if (el3) el3.textContent = pendingReports;
}

function updateUserReportsList() {
    const listContainer = document.getElementById('userReportsList');
    if (!listContainer || !currentUser) return;

    const userReportsFiltered = userReports.filter(r => r.userId === currentUser.id);

    if (userReportsFiltered.length === 0) {
        listContainer.innerHTML = '<p style="text-align: center; color: var(--text-muted); padding: 2rem;">No reports yet. Submit your first report!</p>';
        return;
    }

    listContainer.innerHTML = userReportsFiltered.map(report => {
        const icon = getReportIcon(report.type);
        const date = new Date(report.timestamp).toLocaleDateString();

        return `
            <div class="report-item">
                <div class="report-icon">${icon}</div>
                <div class="report-details">
                    <h4>${getReportTypeLabel(report.type)}</h4>
                    <p>${report.location} • ${date}</p>
                    <p style="margin-top: 0.5rem;">${report.description}</p>
                </div>
                <span class="report-status ${report.status}">${report.status}</span>
            </div>
        `;
    }).join('');
}

async function updateCommunityStats() {
    try {
        const response = await fetch('/api/reports/stats/community', {
            method: 'GET',
            credentials: 'include'
        });

        if (response.ok) {
            const stats = await response.json();

            const el1 = document.getElementById('communityTotalReports');
            const el2 = document.getElementById('communityResolvedReports');

            if (el1) el1.textContent = stats.totalReports;
            if (el2) el2.textContent = stats.resolvedReports;
        }
    } catch (error) {
        console.error('Error loading community stats:', error);
    }
}

// ===========================
// USER MAP - ZONE HEATMAP
// ===========================

function initUserMap() {
    const mapElement = document.getElementById('userMap');
    if (!mapElement) {
        console.warn('User map element not found');
        return;
    }

    if (userMap) {
        userMap.remove();
        userMap = null;
    }

    setTimeout(() => {
        try {
            userMap = L.map('userMap', {
                minZoom: 12,
                maxZoom: 18,
                zoomControl: true,
            }).setView(KAZANLAK_BOUNDS.center, 13);

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors',          // ← ADD THIS
            }).addTo(userMap);

            displayUserZones();

            console.log('✅ User heatmap initialized');
        } catch (error) {
            console.error('Error initializing user map:', error);
        }
    }, 200);
}

function displayUserZones() {
    if (!userMap) return;

    const zones = [
        { name: 'Zone A', lat: 42.625, lng: 25.405, activity: 'high', bins: 15 },
        { name: 'Zone B', lat: 42.620, lng: 25.395, activity: 'medium', bins: 10 },
        { name: 'Zone C', lat: 42.615, lng: 25.385, activity: 'low', bins: 8 },
        { name: 'Zone D', lat: 42.610, lng: 25.410, activity: 'medium', bins: 12 },
        { name: 'Zone E', lat: 42.628, lng: 25.390, activity: 'high', bins: 9 }
    ];

    zones.forEach(zone => {
        const color = zone.activity === 'high' ? '#ef4444' :
            zone.activity === 'medium' ? '#f59e0b' : '#10b981';

        const circle = L.circle([zone.lat, zone.lng], {
            color: color,
            fillColor: color,
            fillOpacity: 0.3,
            radius: 800,
            weight: 2
        }).addTo(userMap);

        circle.bindPopup(`
            <div style="color: #1e293b; font-family: system-ui; padding: 0.8rem; min-width: 200px;">
                <strong style="font-size: 1.2rem;">${zone.name}</strong><br>
                <div style="margin-top: 0.5rem;">
                    Priority: <strong style="color: ${color};">${zone.activity.toUpperCase()}</strong>
                </div>
                <div style="margin-top: 0.5rem; color: #64748b;">
                    📍 Bins in zone: ${zone.bins}<br>
                    🚛 Collections: ${zone.activity === 'high' ? '5-7/week' : zone.activity === 'medium' ? '3-4/week' : '1-2/week'}
                </div>
            </div>
        `);
    });
}

// ===========================
// COLLECTOR DASHBOARD
// ===========================

function initCollectorDashboard() {
    console.log('🚛 Initializing Collector Dashboard');

    collectorCompleted = 0;
    updateCollectorProgress();

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

    Object.keys(buttons).forEach(btnId => {
        const btn = document.getElementById(btnId);
        if (btn) {
            const newBtn = btn.cloneNode(true);
            btn.parentNode.replaceChild(newBtn, btn);
            newBtn.addEventListener('click', buttons[btnId]);
        }
    });

    setTimeout(() => initCollectorHeatmap(), 500);
}

function initCollectorHeatmap() {
    const mapElement = document.getElementById('collectorHeatmap');
    if (!mapElement) {
        console.warn('Collector heatmap element not found');
        return;
    }

    // ✅ IMPROVED CLEANUP
    if (collectorMap) {
        try {
            collectorMap.off();
            collectorMap.remove();
        } catch (e) {
            console.warn('Error removing old map:', e);
        }
        collectorMap = null;
    }

    // ✅ CLEAR CONTAINER
    mapElement.innerHTML = '';
    mapElement._leaflet_id = null;

    setTimeout(() => {
        try {
            collectorMap = L.map('collectorHeatmap', {
                minZoom: 12,
                maxZoom: 18,
                zoomControl: true,
                maxBounds: kazanlakLatLngBounds,
                maxBoundsViscosity: 1.0
            }).setView([42.6191, 25.3978], 14);

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors',
                bounds: kazanlakLatLngBounds
            }).addTo(collectorMap);

            displayCollectorBins();

            console.log('✅ Collector bin map initialized');
        } catch (error) {
            console.error('Error initializing collector map:', error);
        }
    }, 200);
}

function displayCollectorBins() {
    if (!collectorMap) return;

    collectorMarkers.forEach(marker => {
        try {
            collectorMap.removeLayer(marker);
        } catch (e) {
            console.warn('Error removing marker:', e);
        }
    });
    collectorMarkers = [];

    containerData.forEach(bin => {
        const isCollected = collectedBins.has(bin.id);

        let fillColor, radius;
        if (isCollected) {
            fillColor = '#64748b';
            radius = 8;
        } else {
            fillColor = bin.status === 'empty' ? '#10b981' :
                bin.status === 'warning' ? '#f59e0b' : '#ef4444';
            radius = bin.status === 'critical' ? 12 : 8;
        }

        const borderColor = bin.zone === 'north' ? '#dc3545' : '#28a745';

        try {
            const marker = L.circleMarker([bin.lat, bin.lng], {
                radius: radius,
                fillColor: fillColor,
                color: borderColor,
                weight: 3,
                opacity: 1,
                fillOpacity: isCollected ? 0.5 : 0.9
            }).addTo(collectorMap);

            const zoneLabel = bin.zone === 'north' ? 'North (Red)' : 'South (Green)';

            marker.bindPopup(`
                <div style="color: #1e293b; font-family: system-ui; padding: 0.8rem; min-width: 250px;">
                    <strong style="font-size: 1.1rem;">Container #${bin.id}</strong>
                    ${isCollected ? '<span style="color: #64748b; font-weight: bold;"> ✅ COLLECTED</span>' :
                    bin.status === 'critical' ? '<span style="color: #ef4444; font-weight: bold;"> ⚠️ URGENT</span>' : ''}
                    <br>
                    <div style="margin-top: 0.5rem;">
                        <span style="color: ${fillColor}; font-size: 1.5rem;">●</span> 
                        <strong style="font-size: 1.3rem;">${bin.fillLevel.toFixed(1)}%</strong> Full
                    </div>
                    <div style="margin-top: 0.5rem; padding: 0.5rem; background: rgba(100,116,139,0.1); border-radius: 6px;">
                        Zone: <strong style="color: ${borderColor};">${zoneLabel}</strong><br>
                        Status: <strong style="color: ${fillColor};">${isCollected ? 'COLLECTED' : bin.status.toUpperCase()}</strong><br>
                        🌡️ Temperature: ${bin.temperature.toFixed(1)}°C<br>
                        📍 Container ID: ${bin.containerId}
                    </div>
                    ${!isCollected ? `
                        <button onclick="confirmMarkBin('${bin.id}')" style="
                            width: 100%;
                            margin-top: 0.8rem;
                            padding: 0.6rem;
                            background: #10b981;
                            color: white;
                            border: none;
                            border-radius: 8px;
                            font-weight: 600;
                            cursor: pointer;
                            transition: background 0.3s;
                        " onmouseover="this.style.background='#059669'" onmouseout="this.style.background='#10b981'">
                            ✅ Mark as Collected
                        </button>
                    ` : `
                        <div style="
                            width: 100%;
                            margin-top: 0.8rem;
                            padding: 0.6rem;
                            background: rgba(100,116,139,0.2);
                            color: #64748b;
                            border-radius: 8px;
                            font-weight: 600;
                            text-align: center;
                        ">
                            ✅ Already Collected
                        </div>
                    `}
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

async function markBinComplete() {
    // Get uncollected bins
    const uncollectedBins = containerData.filter(b => !collectedBins.has(b.id));

    if (uncollectedBins.length === 0) {
        showNotification('All bins have been collected!', 'info');
        return;
    }

    // Create modal to select bin
    const modalHTML = `
        <div class="modal active" id="markBinModal">
            <div class="modal-content" style="max-width: 800px;">
                <div class="modal-header" id="place">
                    <h2>✅ Mark Bin as Collected</h2>
                    <button class="modal-close" onclick="closeMarkBinModal()">&times;</button>
                </div>
                <div style="padding: 2rem;">
                    <p style="color: var(--text-secondary); margin-bottom: 1.5rem;">
                        Select which container you have collected:
                    </p>
                    <div style="max-height: 400px; overflow-y: auto;">
                        ${uncollectedBins.map(bin => {
        const statusColor = bin.status === 'critical' ? '#ef4444' :
            bin.status === 'warning' ? '#f59e0b' : '#10b981';
        const zoneColor = bin.zone === 'north' ? '#dc3545' : '#28a745';

        return `
                                <div class="bin-select-item" onclick="confirmMarkBin('${bin.id}')" style="
                                    padding: 1rem;
                                    background: var(--glass-bg);
                                    border: 2px solid var(--glass-border);
                                    border-radius: 12px;
                                    margin-bottom: 1rem;
                                    cursor: pointer;
                                    transition: all 0.3s;
                                    display: flex;
                                    justify-content: space-between;
                                    align-items: center;
                                " onmouseover="this.style.borderColor='var(--primary-green)'; this.style.transform='translateX(5px)';" 
                                   onmouseout="this.style.borderColor='var(--glass-border)'; this.style.transform='translateX(0)';">
                                    <div>
                                        <div style="font-size: 1.2rem; font-weight: 700; margin-bottom: 0.5rem;">
                                            🗑️ Container #${bin.id}
                                        </div>
                                        <div style="display: flex; gap: 1rem; font-size: 0.9rem; color: var(--text-muted);">
                                            <span>📍 ${bin.address || 'Unknown location'}</span>
                                            <span style="color: ${zoneColor};">● ${bin.zone.toUpperCase()}</span>
                                        </div>
                                    </div>
                                    <div style="text-align: right;">
                                        <div style="font-size: 2rem; font-weight: 700; color: ${statusColor};">
                                            ${bin.fillLevel.toFixed(0)}%
                                        </div>
                                        <div style="font-size: 0.85rem; color: ${statusColor};">
                                            ${bin.status.toUpperCase()}
                                        </div>
                                    </div>
                                </div>
                            `;
    }).join('')}
                    </div>
                    <button onclick="closeMarkBinModal()" style="
                        width: 100%;
                        padding: 1rem;
                        margin-top: 1.5rem;
                        background: var(--glass-bg);
                        border: 1px solid var(--glass-border);
                        border-radius: 12px;
                        color: var(--text-primary);
                        cursor: pointer;
                        font-weight: 600;
                    ">Cancel</button>
                </div>
            </div>
        </div>
    `;

    // Remove old modal if exists
    const oldModal = document.getElementById('markBinModal');
    if (oldModal) oldModal.remove();

    // Insert modal
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

// Array to store selected bin IDs
let selectedBinIds = [];

function confirmMarkBin(binId) {
    // Extract the number after the '#' if present
    const id = binId.toString().replace('#', '');
    
    // Toggle selection
    const index = selectedBinIds.indexOf(id);
    if (index > -1) {
        // Remove from selection
        selectedBinIds.splice(index, 1);
        console.log('➖ Bin removed from selection:', id);
    } else {
        // Add to selection
        selectedBinIds.push(id);
        console.log('➕ Bin added to selection:', id);
    }
    
    // Update visual styling
    const binElement = event.target.closest('.bin-select-item');
    if (binElement) {
        binElement.classList.toggle('selected');
    }
    
    // Show/hide the dispose button
    updateDisposeButton();
    
    console.log('📋 Currently selected bins:', selectedBinIds);
}

function updateDisposeButton() {
    let btn = document.getElementById('confirmDisposeBtn');
    const modalHeader = document.getElementById('place');
    console.log("TESTIN 123");
    if (selectedBinIds.length > 0) {
        // Show button if bins are selected
        if (!btn) {
            btn = document.createElement('button');
            btn.id = 'confirmDisposeBtn';
            btn.innerHTML = `Dispose Selected <span class="badge">${selectedBinIds.length}</span>`;
            btn.onclick = disposeSelectedBins;
            modalHeader.appendChild(btn);
        } else {
            btn.querySelector('.badge').textContent = selectedBinIds.length;
        }
        btn.style.display = 'block';
    } else {
        // Hide button if no bins selected
        if (btn) {
            btn.style.display = 'none';
        }
    }
}

async function disposeSelectedBins() {
    if (selectedBinIds.length === 0) {
        showNotification('No bins selected!', 'warning');
        return;
    }
    
    // Convert string IDs to integers
    const containerIds = selectedBinIds.map(id => parseInt(id));
    
    console.log('🗑️ Disposing bins:', containerIds);
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/TrashContainer/api/DisposeOfTrash`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify(containerIds)
        });
        
        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }
        
        showNotification(`✅ Successfully disposed ${selectedBinIds.length} bins!`, 'success');
        
        // Mark bins as collected locally
        selectedBinIds.forEach(id => {
            collectedBins.add(id);
            const bin = containerData.find(b => b.id == id);
            if (bin) {
                bin.fillLevel = 5 + Math.random() * 10;
                bin.status = 'empty';
            }
        });
        
        collectorCompleted += selectedBinIds.length;
        
        // Clear selection
        selectedBinIds = [];
        updateDisposeButton();
        
        // Close modal and refresh
        closeMarkBinModal();
        updateCollectorProgress();
        
        if (collectorMap) {
            displayCollectorBins();
        }
        
        // Reload data from backend
        await loadContainersFromBackend();
        
    } catch (error) {
        console.error('❌ Failed to dispose bins:', error);
        showNotification('Failed to dispose bins. Please try again.', 'warning');
    }
}

function closeMarkBinModal() {
    const modal = document.getElementById('markBinModal');
    if (modal) modal.remove();
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

// ===========================
// ADMIN DASHBOARD
// ===========================

function initAdminDashboard() {
    console.log('⚙️ Initializing Admin Dashboard');

    updateDashboardStats();
    loadAdminReports();
    initAdminAlerts();

    const buttons = {
        'adminViewMapBtn': () => {
            const section = document.getElementById('map');
            if (section) section.scrollIntoView({ behavior: 'smooth' });
        },
        'adminViewReportsBtn': () => {
            const section = document.querySelector('.reports-management');
            if (section) section.scrollIntoView({ behavior: 'smooth' });
        }
    };

    Object.keys(buttons).forEach(btnId => {
        const btn = document.getElementById(btnId);
        if (btn) {
            const newBtn = btn.cloneNode(true);
            btn.parentNode.replaceChild(newBtn, btn);
            newBtn.addEventListener('click', buttons[btnId]);
        }
    });

    document.querySelectorAll('.map-filter-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            document.querySelectorAll('.map-filter-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');

            const filter = this.getAttribute('data-filter');
            displayAdminBins(filter);
        });
    });

    document.querySelectorAll('.reports-filters .filter-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            document.querySelectorAll('.reports-filters .filter-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');

            const filter = this.getAttribute('data-filter');
            filterAdminReports(filter);
        });
    });

    document.querySelectorAll('.route-view-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            displayAdminRoute();
        });
    });

    setTimeout(() => {
        initAdminMap();
        initHeatmap();
        initAdminCharts();
    }, 500);
}

function initAdminMap() {
    const mapElement = document.getElementById('adminMap');
    if (!mapElement) {
        console.warn('Admin map element not found');
        return;
    }

    if (adminMap) {
        adminMap.remove();
        adminMap = null;
    }

    setTimeout(() => {
        try {
            adminMap = L.map('adminMap', {
                minZoom: 12,
                maxZoom: 18,
                zoomControl: true,
                maxBounds: kazanlakLatLngBounds,
                maxBoundsViscosity: 1.0
            }).setView([42.6191, 25.3978], 14);

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors',
                bounds: kazanlakLatLngBounds
            }).addTo(adminMap);

            displayAdminBins('all');

            console.log('✅ Admin map initialized');

            setInterval(() => {
                if (adminMap) {
                    const activeFilter = document.querySelector('.map-filter-btn.active')?.getAttribute('data-filter') || 'all';
                    displayAdminBins(activeFilter);
                }
            }, 5000);
        } catch (error) {
            console.error('Error initializing admin map:', error);
        }
    }, 200);
}

function displayAdminBins(filter = 'all') {
    if (!adminMap) return;

    adminMarkers.forEach(marker => {
        try {
            adminMap.removeLayer(marker);
        } catch (e) {
            console.warn('Error removing marker:', e);
        }
    });
    adminMarkers = [];

    const filteredBins = filter === 'all'
        ? containerData
        : containerData.filter(bin => bin.status === filter);

    filteredBins.forEach(bin => {
        const fillColor = bin.status === 'empty' ? '#10b981' :
            bin.status === 'warning' ? '#f59e0b' : '#ef4444';

        const borderColor = bin.zone === 'north' ? '#dc3545' : '#28a745';

        const tempWarning = bin.temperature > 30 ? ' 🔥' : '';
        const zoneLabel = bin.zone === 'north' ? 'North (Red)' : 'South (Green)';

        try {
            const marker = L.circleMarker([bin.lat, bin.lng], {
                radius: 8,
                fillColor: fillColor,
                color: borderColor,
                weight: 3,
                opacity: 1,
                fillOpacity: 0.8
            }).addTo(adminMap);

            marker.bindPopup(`
                <div style="color: #1e293b; font-family: system-ui; padding: 0.5rem; min-width: 200px;">
                    <strong style="font-size: 1.1rem;">Container #${bin.id}${tempWarning}</strong><br>
                    <div style="margin-top: 0.5rem;">
                        <span style="color: ${fillColor};">●</span> 
                        <strong>${bin.fillLevel.toFixed(1)}%</strong> Full
                    </div>
                    <div style="margin-top: 0.3rem; font-size: 0.9rem; color: #64748b;">
                        Zone: <strong style="color: ${borderColor};">${zoneLabel}</strong>
                    </div>
                    <div style="margin-top: 0.3rem; font-size: 0.9rem; color: #64748b;">
                        Status: ${bin.status.charAt(0).toUpperCase() + bin.status.slice(1)}
                    </div>
                    <div style="margin-top: 0.3rem; font-size: 0.9rem; color: #64748b;">
                        🌡️ Temperature: ${bin.temperature.toFixed(1)}°C
                    </div>
                </div>
            `);

            adminMarkers.push(marker);
        } catch (error) {
            console.error('Error adding admin marker:', error);
        }
    });
}

function displayAdminRoute() {
    if (!adminMap) {
        showNotification('Please wait for map to load', 'warning');
        return;
    }

    const routeBins = containerData
        .filter(bin => bin.status === 'critical' || bin.status === 'warning')
        .slice(0, 20);

    const latlngs = routeBins.map(c => [c.lat, c.lng]);

    try {
        const polyline = L.polyline(latlngs, {
            color: '#10b981',
            weight: 3,
            opacity: 0.7,
            dashArray: '10, 10'
        }).addTo(adminMap);

        showNotification('Route displayed on map', 'success');

        setTimeout(() => {
            try {
                adminMap.removeLayer(polyline);
            } catch (e) {
                console.warn('Error removing route:', e);
            }
        }, 10000);
    } catch (error) {
        console.error('Error displaying route:', error);
    }
}

function initHeatmap() {
    const heatmapContainer = document.getElementById('heatmapContainer');
    if (!heatmapContainer) return;

    if (heatmapMap) {
        heatmapMap.remove();
        heatmapMap = null;
    }

    setTimeout(() => {
        try {
            heatmapMap = L.map('heatmapContainer').setView([42.6191, 25.3978], 12);

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors',
                bounds: kazanlakLatLngBounds
            }).addTo(heatmapMap);

            const zones = [
                { name: 'Zone A', lat: 42.625, lng: 25.405, activity: 'high', bins: 15 },
                { name: 'Zone B', lat: 42.620, lng: 25.395, activity: 'medium', bins: 10 },
                { name: 'Zone C', lat: 42.615, lng: 25.385, activity: 'low', bins: 8 },
                { name: 'Zone D', lat: 42.610, lng: 25.410, activity: 'medium', bins: 12 },
                { name: 'Zone E', lat: 42.628, lng: 25.390, activity: 'high', bins: 9 },
            ];

            zones.forEach(zone => {
                const color = zone.activity === 'high' ? '#ef4444' :
                    zone.activity === 'medium' ? '#f59e0b' : '#10b981';

                const circle = L.circle([zone.lat, zone.lng], {
                    color: color,
                    fillColor: color,
                    fillOpacity: 0.3,
                    radius: 800
                }).addTo(heatmapMap);

                circle.bindPopup(`
                    <div style="color: #1e293b; font-family: system-ui; padding: 0.5rem;">
                        <strong>${zone.name}</strong><br>
                        Activity: <strong style="color: ${color};">${zone.activity.toUpperCase()}</strong><br>
                        Bins: ${zone.bins}<br>
                        Collections/week: ${zone.activity === 'high' ? '5-7' : zone.activity === 'medium' ? '3-4' : '1-2'}
                    </div>
                `);
            });

            console.log('✅ Heatmap initialized');
        } catch (error) {
            console.error('Error initializing heatmap:', error);
        }
    }, 200);
}

// ===========================
// ADMIN REPORTS & ALERTS
// ===========================

async function loadAdminReports() {
    try {
        const response = await fetch('/api/reports/all', {
            method: 'GET',
            credentials: 'include'
        });

        if (response.ok) {
            userReports = await response.json();

            const pending = userReports.filter(r => r.status === 'pending').length;
            const inProgress = userReports.filter(r => r.status === 'in-progress').length;
            const resolved = userReports.filter(r => r.status === 'resolved').length;

            const elements = {
                'allReportsCount': userReports.length,
                'pendingReportsCount': pending,
                'progressReportsCount': inProgress,
                'resolvedReportsCount': resolved
            };

            Object.keys(elements).forEach(id => {
                const el = document.getElementById(id);
                if (el) el.textContent = elements[id];
            });

            filterAdminReports('all');
        }
    } catch (error) {
        console.error('Error loading admin reports:', error);
    }
}

function filterAdminReports(filter) {
    const tableContainer = document.getElementById('adminReportsTable');
    if (!tableContainer) return;

    const filteredReports = filter === 'all'
        ? userReports
        : userReports.filter(r => r.status === filter);

    if (filteredReports.length === 0) {
        tableContainer.innerHTML = '<p style="text-align: center; padding: 2rem; color: var(--text-muted);">No reports found</p>';
        return;
    }

    tableContainer.innerHTML = `
        <div style="padding: 1.5rem;">
            ${filteredReports.map(report => {
        const icon = getReportIcon(report.type);
        const date = new Date(report.timestamp).toLocaleDateString();

        return `
                    <div class="report-item">
                        <div class="report-icon">${icon}</div>
                        <div class="report-details">
                            <h4>${getReportTypeLabel(report.type)}</h4>
                            <p>${report.location} • ${date} • By ${report.userName || 'User'}</p>
                            <p style="margin-top: 0.5rem;">${report.description}</p>
                        </div>
                        <span class="report-status ${report.status}">${report.status}</span>
                    </div>
                `;
    }).join('')}
        </div>
    `;
}

function initAdminAlerts() {
    setInterval(() => {
        if (currentUser && currentUser.role === 'admin') {
            generateRandomAlert();
        }
    }, 15000);
}

function generateRandomAlert() {
    const alerts = [
        { type: 'info', icon: '💡', title: 'Route Optimization', message: 'New optimal route found for zone 3' },
        { type: 'warning', icon: '⏰', title: 'Overflow Warning', message: 'Container #27 needs attention within 90 minutes' },
        { type: 'success', icon: '🎉', title: 'Efficiency Gain', message: 'Fuel consumption decreased by 15% this week' }
    ];

    const alert = alerts[Math.floor(Math.random() * alerts.length)];
    addAlert(alert);
}

function addAlert(alertData) {
    const container = document.getElementById('adminAlertsContainer');
    if (!container) return;

    const alertHTML = `
        <div class="alert-card ${alertData.type}" style="animation: slideIn 0.5s ease-out;">
            <span class="alert-icon">${alertData.icon}</span>
            <div class="alert-content">
                <strong>${alertData.title}</strong>
                <p>${alertData.message}</p>
            </div>
            <span class="alert-time">Just now</span>
        </div>
    `;

    container.insertAdjacentHTML('afterbegin', alertHTML);

    while (container.children.length > 5) {
        container.removeChild(container.lastChild);
    }
}

function checkFireRisk() {
    containerData.forEach(bin => {
        if (bin.temperature > 45) {
            const existingAlerts = document.querySelectorAll('.alert-card');
            const hasFireAlert = Array.from(existingAlerts).some(alert =>
                alert.textContent.includes(`Container #${bin.id}`) &&
                alert.textContent.includes('FIRE')
            );

            if (!hasFireAlert && currentUser && currentUser.role === 'admin') {
                addAlert({
                    type: 'warning',
                    icon: '🔥',
                    title: 'FIRE RISK DETECTED',
                    message: `Container #${bin.id} temperature critical: ${bin.temperature.toFixed(1)}°C! Immediate action required.`
                });

                console.warn(`🔥 FIRE RISK: Container #${bin.id} at ${bin.temperature.toFixed(1)}°C`);
            }
        }
    });
}

setInterval(() => {
    if (currentUser && currentUser.role === 'admin') {
        checkFireRisk();
    }
}, 10000);

// ===========================
// ADMIN CHARTS
// ===========================

function initAdminCharts() {
    if (typeof Chart === 'undefined') {
        console.error('Chart.js not loaded');
        return;
    }

    initFillLevelChart();
    initEfficiencyChart();
    initHistoryChart();
    initTemperatureChart();

    setInterval(() => {
        if (currentUser && currentUser.role === 'admin') {
            updateFillLevelChart();
        }
    }, 10000);
}

function initFillLevelChart() {
    const fillCtx = document.getElementById('adminFillLevelChart');
    if (!fillCtx) return;

    const empty = containerData.filter(c => c.status === 'empty').length;
    const warning = containerData.filter(c => c.status === 'warning').length;
    const critical = containerData.filter(c => c.status === 'critical').length;

    try {
        adminCharts.fillLevel = new Chart(fillCtx, {
            type: 'doughnut',
            data: {
                labels: ['Empty (0-50%)', 'Warning (50-80%)', 'Critical (80-100%)'],
                datasets: [{
                    data: [empty, warning, critical],
                    backgroundColor: ['#10b981', '#f59e0b', '#ef4444'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { color: '#cbd5e1', padding: 15 }
                    }
                }
            }
        });
        console.log('✅ Fill level chart initialized');
    } catch (error) {
        console.error('Error creating fill level chart:', error);
    }
}

function updateFillLevelChart() {
    if (!adminCharts.fillLevel) return;

    const empty = containerData.filter(c => c.status === 'empty').length;
    const warning = containerData.filter(c => c.status === 'warning').length;
    const critical = containerData.filter(c => c.status === 'critical').length;

    adminCharts.fillLevel.data.datasets[0].data = [empty, warning, critical];
    adminCharts.fillLevel.update();
}

function initEfficiencyChart() {
    const effCtx = document.getElementById('adminEfficiencyChart');
    if (!effCtx) return;

    try {
        adminCharts.efficiency = new Chart(effCtx, {
            type: 'line',
            data: {
                labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                datasets: [{
                    label: 'Collection Efficiency %',
                    data: [65, 72, 78, 85, 88, 92, 95],
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    tension: 0.4,
                    fill: true,
                    borderWidth: 3
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { labels: { color: '#cbd5e1' } }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        ticks: { color: '#cbd5e1' },
                        grid: { color: 'rgba(255, 255, 255, 0.1)' }
                    },
                    x: {
                        ticks: { color: '#cbd5e1' },
                        grid: { color: 'rgba(255, 255, 255, 0.1)' }
                    }
                }
            }
        });
        console.log('✅ Efficiency chart initialized');
    } catch (error) {
        console.error('Error creating efficiency chart:', error);
    }
}

function initHistoryChart() {
    const historyCtx = document.getElementById('historyChart');
    if (!historyCtx) return;

    const days = [];
    const emptyData = [];
    const warningData = [];
    const criticalData = [];

    for (let i = 30; i >= 0; i--) {
        days.push(`Day ${31 - i}`);
        emptyData.push(70 + Math.random() * 20);
        warningData.push(35 + Math.random() * 20);
        criticalData.push(10 + Math.random() * 15);
    }

    try {
        adminCharts.history = new Chart(historyCtx, {
            type: 'line',
            data: {
                labels: days,
                datasets: [
                    {
                        label: 'Empty',
                        data: emptyData,
                        borderColor: '#10b981',
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        tension: 0.4,
                        fill: true
                    },
                    {
                        label: 'Warning',
                        data: warningData,
                        borderColor: '#f59e0b',
                        backgroundColor: 'rgba(245, 158, 11, 0.1)',
                        tension: 0.4,
                        fill: true
                    },
                    {
                        label: 'Critical',
                        data: criticalData,
                        borderColor: '#ef4444',
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                        tension: 0.4,
                        fill: true
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { labels: { color: '#cbd5e1' } }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        ticks: { color: '#cbd5e1' },
                        grid: { color: 'rgba(255, 255, 255, 0.1)' }
                    },
                    x: {
                        ticks: {
                            color: '#cbd5e1',
                            maxTicksLimit: 10
                        },
                        grid: { color: 'rgba(255, 255, 255, 0.1)' }
                    }
                }
            }
        });
        console.log('✅ History chart initialized');
    } catch (error) {
        console.error('Error creating history chart:', error);
    }
}

function initTemperatureChart() {
    const tempCtx = document.getElementById('temperatureChart');
    if (!tempCtx) return;

    const hours = [];
    const tempData = [];

    for (let i = 24; i >= 0; i--) {
        hours.push(`${i}h ago`);
        tempData.push(18 + Math.random() * 15);
    }

    try {
        adminCharts.temperature = new Chart(tempCtx, {
            type: 'line',
            data: {
                labels: hours.reverse(),
                datasets: [{
                    label: 'Avg Temperature (°C)',
                    data: tempData.reverse(),
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    tension: 0.4,
                    fill: true,
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { labels: { color: '#cbd5e1' } }
                },
                scales: {
                    y: {
                        beginAtZero: false,
                        min: 15,
                        max: 35,
                        ticks: { color: '#cbd5e1' },
                        grid: { color: 'rgba(255, 255, 255, 0.1)' }
                    },
                    x: {
                        ticks: {
                            color: '#cbd5e1',
                            maxTicksLimit: 8
                        },
                        grid: { color: 'rgba(255, 255, 255, 0.1)' }
                    }
                }
            }
        });
        console.log('✅ Temperature chart initialized');
    } catch (error) {
        console.error('Error creating temperature chart:', error);
    }
}

document.querySelectorAll('.time-btn').forEach(button => {
    button.addEventListener('click', function () {
        document.querySelectorAll('.time-btn').forEach(btn => btn.classList.remove('active'));
        this.classList.add('active');

        const period = this.textContent;
        showNotification(`Showing data for ${period} period`, 'info');
    });
});

// ===========================
// UTILITY FUNCTIONS
// ===========================

function updateLiveStatus() {
    const liveBadge = document.getElementById('heroLiveUpdate');
    if (liveBadge) {
        const statuses = ['Live', 'Online', 'Active'];
        let index = 0;
        setInterval(() => {
            liveBadge.textContent = statuses[index];
            index = (index + 1) % statuses.length;
        }, 3000);
    }
}

function animateCounter(element, target, duration = 2000) {
    if (!element) return;

    const start = 0;
    const increment = target / (duration / 16);
    let current = start;

    const timer = setInterval(() => {
        current += increment;
        if (current >= target) {
            element.textContent = Math.floor(target);
            clearInterval(timer);
        } else {
            element.textContent = Math.floor(current);
        }
    }, 16);
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function timeAgo(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);

    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
    return `${Math.floor(seconds / 86400)} days ago`;
}

function startAutoRefresh() {
    setInterval(() => {
        if (currentUser) {
            if (currentUser.role === 'user') {
                updateUserStats();
                if (userMap) displayUserZones();
            } else if (currentUser.role === 'collector') {
                if (collectorMap) displayCollectorBins();
            } else if (currentUser.role === 'admin') {
                if (adminMap) {
                    const activeFilter = document.querySelector('.map-filter-btn.active')?.getAttribute('data-filter') || 'all';
                    displayAdminBins(activeFilter);
                }
            }
        }
    }, 7000);
}

// ===========================
// INITIALIZATION
// ===========================
document.addEventListener('DOMContentLoaded', async () => {
    console.log('%c🗑️ BinMaps - Smart Waste Management System', 'font-size: 20px; font-weight: bold; color: #10b981');
    console.log('%c📊 System Status:', 'font-size: 14px; font-weight: bold; color: #3b82f6');

    const homeLoginBtn = document.getElementById('homeLoginBtn');
    if (homeLoginBtn) {
        homeLoginBtn.addEventListener('click', () => {
            showLoginScreen();
        });
    }

     // 1. Load initial container data from backend
    await loadContainersFromBackend();

    // 2. Check authentication
    await checkAuth();
    updateLiveStatus();
    startAutoRefresh();

    // 3. ⚠️ WAIT for sensors to update before sending to backend
    // Give sensors time to generate initial realistic data
    setTimeout(async () => {
        await updateSensorsWithBackend();
    }, 1000);

    setInterval(async () => {
        await updateSensorsWithBackend();
        console.log('Updated data sensors')
    }, 20000); // ← Also change from 500ms to 20000ms (20 seconds)

    console.log('  ✓ Authentication system active');
    console.log('  ✓ Initial containers loaded from backend');
    console.log('  ✓ First sensor data sent to backend');
    console.log('  ✓ Backend sync every 20s (frontend → backend → frontend)');
    console.log('  ✓ Role-based dashboards loaded');
    console.log('%c🚀 BinMaps fully initialized!', 'font-size: 14px; font-weight: bold; color: #10b981');
});

window.addEventListener('load', () => {
    const heroTotalBins = document.getElementById('heroTotalBins');
    if (heroTotalBins) {
        animateCounter(heroTotalBins, containerData.length);
    }
});

// ===========================
// ERROR HANDLING
// ===========================
window.addEventListener('error', (e) => {
    console.error('Global error caught:', e.error);
});

window.addEventListener('unhandledrejection', (e) => {
    console.error('Unhandled promise rejection:', e.reason);
});