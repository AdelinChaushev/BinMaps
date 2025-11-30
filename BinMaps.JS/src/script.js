// ===========================
// GLOBAL VARIABLES 
// ===========================

// Current user state
let currentUser = null;

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
// ===========================
// AUTHENTICATION SYSTEM
// ===========================

// Check if user is already logged in
// TODO: Replace with API endpoint to validate existing session/token
async function checkAuth() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/Auth/verify`, {
            method: 'GET',
            credentials: 'include'
        });

        if (response.ok) {
            const userData = await response.json();
            console.log(userData);
            // Handle role as array - take the first role or default to 'user'
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

// Show home page
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

// Show login screen
function showLoginScreen() {
    document.getElementById('homePage').classList.remove('active');
    document.getElementById('loginScreen').classList.add('active');
    document.getElementById('navbar').style.display = 'none';
    document.getElementById('userDashboard').style.display = 'none';
    document.getElementById('collectorDashboard').style.display = 'none';
    document.getElementById('adminDashboard').style.display = 'none';
}

// Login form handler
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
                credentials: 'include', // IMPORTANT: Include credentials to receive cookies
                body: JSON.stringify({
                    email: email,
                    password: password
                })
            });

            if (!response.ok) {
                const errorData = await response.text();
                throw new Error(errorData || 'Login failed');
            }

            // If backend sets the cookie, verify the session immediately
            await checkAuth();
            
            showNotification('Login successful!', 'success');

        } catch (error) {
            console.error('Login error:', error);
            showNotification(error.message || 'Login failed. Please try again.', 'warning');
        }
    });
}

// Show register screen
const showRegisterLink = document.getElementById('showRegister');
if (showRegisterLink) {
    showRegisterLink.addEventListener('click', function (e) {
        e.preventDefault();
        document.getElementById('loginScreen').classList.remove('active');
        document.getElementById('registerScreen').classList.add('active');
    });
}

// Show login screen from register
const showLoginLink = document.getElementById('showLogin');
if (showLoginLink) {
    showLoginLink.addEventListener('click', function (e) {
        e.preventDefault();
        document.getElementById('registerScreen').classList.remove('active');
        document.getElementById('loginScreen').classList.add('active');
    });
}

// Registration form handler
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
                credentials: 'include', // IMPORTANT: Include credentials
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

            // Clear form and immediately check auth (which will show the dashboard)
            registerForm.reset();
            document.getElementById('registerScreen').classList.remove('active');
            
            // Verify session and show dashboard
            await checkAuth();

        } catch (error) {
            console.error('Registration error:', error);
            showNotification(error.message || 'Registration failed. Please try again.', 'warning');
        }
    });
}

// REMOVED: Demo account buttons functionality
// If you want to keep demo accounts, they should authenticate through the backend

// Show appropriate dashboard based on role
function showDashboard(role) {
    // Hide home and login screens
    document.getElementById('homePage').classList.remove('active');
    document.getElementById('loginScreen').classList.remove('active');

    // Show navbar
    document.getElementById('navbar').style.display = 'block';

    // Update user info in navbar
    const userRoleEl = document.getElementById('userRole');
    const userNameEl = document.getElementById('userName');
    if (userRoleEl) userRoleEl.textContent = role.toUpperCase();
    if (userNameEl) userNameEl.textContent = currentUser.name;

    // Hide all dashboards first
    document.getElementById('userDashboard').style.display = 'none';
    document.getElementById('collectorDashboard').style.display = 'none';
    document.getElementById('adminDashboard').style.display = 'none';

    // Show appropriate dashboard
    if (role === 'user') {
        document.getElementById('userDashboard').style.display = 'block';
        const floatingBtn = document.getElementById('floatingReportBtn');
        if (floatingBtn) floatingBtn.style.display = 'flex';
        setTimeout(() => initUserDashboard(), 300);
    } else if (role === 'collector') {
        document.getElementById('collectorDashboard').style.display = 'block';
        const floatingBtn = document.getElementById('floatingReportBtn');
        if (floatingBtn) floatingBtn.style.display = 'none';
        setTimeout(() => initCollectorDashboard(), 300);
    } else if (role === 'admin') {
        document.getElementById('adminDashboard').style.display = 'block';
        const floatingBtn = document.getElementById('floatingReportBtn');
        if (floatingBtn) floatingBtn.style.display = 'none';
        setTimeout(() => initAdminDashboard(), 300);
    }

    // Update navigation links based on role
    updateNavLinks(role);
}

// Update navigation links based on role
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

// Logout handler
// Logout handler
const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', async function () {
        try {
            // API ENDPOINT: POST /api/auth/logout
            await fetch(`${API_BASE_URL}/api/Auth/logout`, {
                method: 'POST',
                credentials: 'include'
            });

            currentUser = null;
            collectedBins.clear();
            showNotification('Logged out successfully', 'info');
            
            // Reload the page to reset everything to initial state
            setTimeout(() => {
                window.location.reload();
            }, 500); // Small delay to show the notification

        } catch (error) {
            console.error('Logout error:', error);
            // Still logout on frontend even if API call fails
            currentUser = null;
            collectedBins.clear();
            
            // Reload the page
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

// Animation styles
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
// SENSOR SIMULATION CLASSES
// ===========================
// NOTE: This sensor simulation should eventually be replaced by
// API ENDPOINT: GET /api/containers or /api/sensors/data
// to fetch real sensor data from your backend

// Ultrasonic Fill-Level Sensor
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

    simulateTrashAccumulation(timeElapsed = 1) {
        const fillRate = Math.random() * 1.5 + 0.5;
        const increase = (fillRate / 60) * timeElapsed;

        if (Math.random() < 0.001) {
            this.currentFillLevel = Math.random() * 20;
            console.log(`🚛 Container ${this.containerId} emptied!`);
        } else {
            this.currentFillLevel = Math.min(100, this.currentFillLevel + increase);
        }

        return this.calculateFillLevel();
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

// Temperature Sensor
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

// Combined Smart Bin Sensor
class SmartBinSensor {
    constructor(containerId, lat, lng, containerHeight = 120) {
        this.containerId = containerId;
        this.location = { lat, lng };
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
            timestamp: new Date().toISOString(),
            fillLevel: fillData.fillLevel,
            distanceFromSensor: fillData.distanceFromSensor,
            temperature: tempData.temperature,
            status: fillData.status,
            fireRisk: tempData.status === 'critical',
            batteryLevel: fillData.batteryLevel,
            signalStrength: -50 - Math.random() * 40,
            sensorHealth: 'operational'
        };
    }

    update() {
        this.ultrasonicSensor.simulateTrashAccumulation(5);
        return this.getCompleteReading();
    }
}

// Initialize sensor network
// TODO: Replace with API ENDPOINT: GET /api/containers
function initializeSensors() {
    sensors = [];
    containerData = [];
    const centerLat = 42.6191;
    const centerLng = 25.3978;

    for (let i = 0; i < 60; i++) {
        const lat = centerLat + (Math.random() - 0.5) * 0.05;
        const lng = centerLng + (Math.random() - 0.5) * 0.05;
        const sensor = new SmartBinSensor(`BIN-${String(i + 1).padStart(3, '0')}`, lat, lng);
        sensors.push(sensor);
        containerData.push(sensor.getCompleteReading());
    }
    console.log('✅ Sensors initialized:', containerData.length);
}

// Update all sensors
// TODO: Replace with API ENDPOINT: GET /api/containers/latest
function updateAllSensors() {
    containerData = sensors.map(sensor => sensor.update());
    updateDashboardStats();
}

// Update dashboard statistics
function updateDashboardStats() {
    const empty = containerData.filter(c => c.status === 'empty').length;
    const warning = containerData.filter(c => c.status === 'warning').length;
    const critical = containerData.filter(c => c.status === 'critical').length;
    const avgTemp = Math.round(containerData.reduce((sum, c) => sum + c.temperature, 0) / containerData.length);

    // Update elements if they exist
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
        heroTotalBins: 60
    };

    Object.keys(elements).forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = elements[id];
    });
}

// Load saved reports
// TODO: Replace with API ENDPOINT: GET /api/reports/user/{userId}
async function loadSavedReports() {
    if (!currentUser) return;

    try {
        // API ENDPOINT: GET /api/reports/user
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

// Close modal on outside click
document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.remove('active');
        }
    });
});

// ESC key to close modals
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal.active').forEach(modal => {
            modal.classList.remove('active');
        });
    }
});

// Report modal handlers
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

// Report form submission
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
            // API ENDPOINT: POST /api/reports
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

            // Update reports display if on user dashboard
            if (currentUser && currentUser.role === 'user') {
                updateUserReportsList();
                updateUserStats();
            }

            // Update admin dashboard if logged in as admin
            if (currentUser && currentUser.role === 'admin') {
                loadAdminReports();
            }

        } catch (error) {
            console.error('Error submitting report:', error);
            showNotification('Failed to submit report. Please try again.', 'warning');
        }
    });
}

// Helper functions for reports
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
    // User navigation
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

    // Collector navigation
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

// ===========================
// SMOOTH SCROLLING
// ===========================
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

// ===========================
// MOBILE MENU
// ===========================
const mobileMenuBtn = document.getElementById('mobileMenuBtn');
const navLinks = document.getElementById('navLinks');

if (mobileMenuBtn) {
    mobileMenuBtn.addEventListener('click', () => {
        mobileMenuBtn.classList.toggle('active');
        if (navLinks) {
            navLinks.style.display = navLinks.style.display === 'flex' ? 'none' : 'flex';
        }
    });
}

// ===========================
// FOOTER NAVIGATION
// ===========================
document.addEventListener('click', (e) => {
    const target = e.target;

    // Check if clicked element is a footer link
    if (target.tagName === 'A' && target.closest('footer')) {
        const href = target.getAttribute('href');

        // Handle different footer links
        if (href === '#how-it-works') {
            e.preventDefault();
            showNotification('How It Works section - Feature coming soon!', 'info');
        } else if (href === '#dashboard') {
            e.preventDefault();
            const dashboardSection = document.getElementById('dashboard');
            if (dashboardSection) {
                dashboardSection.scrollIntoView({ behavior: 'smooth' });
            } else {
                showNotification('Dashboard section not available in this view', 'warning');
            }
        } else if (href === '#map') {
            e.preventDefault();
            const mapSection = document.getElementById('map');
            if (mapSection) {
                mapSection.scrollIntoView({ behavior: 'smooth' });
            } else {
                showNotification('Map section not available in this view', 'warning');
            }
        } else if (href === '#about') {
            e.preventDefault();
            showNotification('About Us - BinMaps: Smart Waste Management for Modern Cities', 'info');
        } else if (href === '#contact') {
            e.preventDefault();
            showNotification('Contact: info@binmaps.com | +359 123 456 789', 'info');
        } else if (href === '#documentation') {
            e.preventDefault();
            showNotification('Documentation - Feature coming soon!', 'info');
        } else if (href === '#blog') {
            e.preventDefault();
            showNotification('Blog - Feature coming soon!', 'info');
        } else if (href === '#home') {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }
});

// ===========================
// USER DASHBOARD
// ===========================

function initUserDashboard() {
    console.log('📱 Initializing User Dashboard');

    updateUserStats();

    // Button handlers
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

    // Attach event listeners
    Object.keys(buttons).forEach(btnId => {
        const btn = document.getElementById(btnId);
        if (btn) {
            // Remove old listener by cloning
            const newBtn = btn.cloneNode(true);
            btn.parentNode.replaceChild(newBtn, btn);
            // Add new listener
            newBtn.addEventListener('click', buttons[btnId]);
        }
    });
}

function toggleUserSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (section) {
        const isVisible = section.style.display !== 'none';
        // Hide all user sections first
        document.querySelectorAll('.reports-section, .map-section, .community-stats-section').forEach(s => {
            s.style.display = 'none';
        });
        // Toggle current section
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

// TODO: Replace with API ENDPOINT: GET /api/reports/stats/community
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
// USER MAP - ZONE HEATMAP ONLY
// ===========================

function initUserMap() {
    const mapElement = document.getElementById('userMap');
    if (!mapElement) {
        console.warn('User map element not found');
        return;
    }

    // Destroy existing map if present
    if (userMap) {
        userMap.remove();
        userMap = null;
    }

    // Wait for element to be visible
    setTimeout(() => {
        try {
            userMap = L.map('userMap').setView([42.6191, 25.3978], 13);

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors'
            }).addTo(userMap);

            displayUserZones();

            console.log('✅ User heatmap initialized');
        } catch (error) {
            console.error('Error initializing user map:', error);
        }
    }, 200);
}

// TODO: Replace with API ENDPOINT: GET /api/zones
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

            console.log('✅ Collector bin map initialized');
        } catch (error) {
            console.error('Error initializing collector map:', error);
        }
    }, 200);
}

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

    // Display all bins
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
                    bin.status === 'critical' ? '<span style="color: #ef4444; font-weight: bold;"> ⚠️ URGENT</span>' : ''}
                    <br>
                    <div style="margin-top: 0.5rem;">
                        <span style="color: ${color}; font-size: 1.5rem;">●</span> 
                        <strong style="font-size: 1.3rem;">${bin.fillLevel.toFixed(1)}%</strong> Full
                    </div>
                    <div style="margin-top: 0.5rem; padding: 0.5rem; background: rgba(100,116,139,0.1); border-radius: 6px;">
                        Status: <strong style="color: ${color};">${isCollected ? 'COLLECTED' : bin.status.toUpperCase()}</strong><br>
                        🌡️ Temperature: ${bin.temperature}°C<br>
                        📍 Container ID: BIN-${String(bin.id).padStart(3, '0')}
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

// TODO: Replace with API ENDPOINT: POST /api/collections/mark-complete
async function markBinComplete() {
    if (collectorCompleted < 20) {
        // Get a random uncollected bin
        const uncollectedBins = containerData.filter(b => !collectedBins.has(b.id));

        if (uncollectedBins.length > 0) {
            const randomBin = uncollectedBins[Math.floor(Math.random() * uncollectedBins.length)];

            try {
                // API ENDPOINT: POST /api/collections/mark-complete
                const response = await fetch('/api/collections/mark-complete', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    credentials: 'include',
                    body: JSON.stringify({
                        containerId: randomBin.id
                    })
                });

                if (!response.ok) {
                    throw new Error('Failed to mark bin as complete');
                }

                collectedBins.add(randomBin.id);
                collectorCompleted++;
                updateCollectorProgress();

                // Update map to show collected bin
                if (collectorMap) {
                    displayCollectorBins();
                }

                showNotification(`Container #${randomBin.id} marked as collected! (${collectorCompleted}/20)`, 'success');

            } catch (error) {
                console.error('Error marking bin complete:', error);
                showNotification('Failed to mark bin as complete. Please try again.', 'warning');
            }
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

// ===========================
// ADMIN DASHBOARD
// ===========================

function initAdminDashboard() {
    console.log('⚙️ Initializing Admin Dashboard');

    updateDashboardStats();
    loadAdminReports();
    initAdminAlerts();

    // Button handlers
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

    // Map filter buttons
    document.querySelectorAll('.map-filter-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            document.querySelectorAll('.map-filter-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');

            const filter = this.getAttribute('data-filter');
            displayAdminBins(filter);
        });
    });

    // Report filter buttons
    document.querySelectorAll('.reports-filters .filter-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            document.querySelectorAll('.reports-filters .filter-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');

            const filter = this.getAttribute('data-filter');
            filterAdminReports(filter);
        });
    });

    // Route view buttons
    document.querySelectorAll('.route-view-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            displayAdminRoute();
        });
    });

    // Initialize maps and charts after delay
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

    // Destroy existing map if present
    if (adminMap) {
        adminMap.remove();
        adminMap = null;
    }

    setTimeout(() => {
        try {
            adminMap = L.map('adminMap').setView([42.6191, 25.3978], 14);

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors'
            }).addTo(adminMap);

            displayAdminBins('all');

            console.log('✅ Admin map initialized');

            // Update map every 5 seconds
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

    // Clear existing markers
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
        const color = bin.status === 'empty' ? '#10b981' :
            bin.status === 'warning' ? '#f59e0b' : '#ef4444';

        const tempWarning = bin.temperature > 30 ? ' 🔥' : '';

        try {
            const marker = L.circleMarker([bin.lat, bin.lng], {
                radius: 8,
                fillColor: color,
                color: '#fff',
                weight: 2,
                opacity: 1,
                fillOpacity: 0.8
            }).addTo(adminMap);

            marker.bindPopup(`
                <div style="color: #1e293b; font-family: system-ui; padding: 0.5rem; min-width: 200px;">
                    <strong style="font-size: 1.1rem;">Container #${bin.id}${tempWarning}</strong><br>
                    <div style="margin-top: 0.5rem;">
                        <span style="color: ${color};">●</span> 
                        <strong>${bin.fillLevel.toFixed(1)}%</strong> Full
                    </div>
                    <div style="margin-top: 0.3rem; font-size: 0.9rem; color: #64748b;">
                        Status: ${bin.status.charAt(0).toUpperCase() + bin.status.slice(1)}
                    </div>
                    <div style="margin-top: 0.3rem; font-size: 0.9rem; color: #64748b;">
                        🌡️ Temperature: ${bin.temperature}°C
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

    // Destroy existing map if present
    if (heatmapMap) {
        heatmapMap.remove();
        heatmapMap = null;
    }

    setTimeout(() => {
        try {
            heatmapMap = L.map('heatmapContainer').setView([42.6191, 25.3978], 12);

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors',
                maxZoom: 19
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

// TODO: Replace with API ENDPOINT: GET /api/reports/all (admin only)
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
    // Initial alerts are already in HTML
    // Add new alerts periodically
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

    // Keep only last 5 alerts
    while (container.children.length > 5) {
        container.removeChild(container.lastChild);
    }
}

// ===========================
// FIRE RISK DETECTION
// ===========================
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
                    message: `Container #${bin.id} temperature critical: ${bin.temperature}°C! Immediate action required.`
                });

                console.warn(`🔥 FIRE RISK: Container #${bin.id} at ${bin.temperature}°C`);
            }
        }
    });
}

// Check fire risk every 10 seconds
setInterval(() => {
    if (currentUser && currentUser.role === 'admin') {
        checkFireRisk();
    }
}, 10000);

// ===========================
// ADMIN CHARTS
// ===========================

function initAdminCharts() {
    // Check if Chart.js is loaded
    if (typeof Chart === 'undefined') {
        console.error('Chart.js not loaded');
        return;
    }

    initFillLevelChart();
    initEfficiencyChart();
    initHistoryChart();
    initTemperatureChart();

    // Update charts periodically
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

// Time period buttons
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
// HOME PAGE BUTTON HANDLERS
// ===========================
document.addEventListener('DOMContentLoaded', () => {
    console.log('%c🗑️ BinMaps - Smart Waste Management System', 'font-size: 20px; font-weight: bold; color: #10b981');
    console.log('%c📊 System Status:', 'font-size: 14px; font-weight: bold; color: #3b82f6');

    // Home page button handlers
    const homeLoginBtn = document.getElementById('homeLoginBtn');

    if (homeLoginBtn) {
        homeLoginBtn.addEventListener('click', () => {
            showLoginScreen();
        });
    }

    // Initialize core systems
    initializeSensors();
    checkAuth().finally(x => console.log(x));

    // Start live updates
    updateLiveStatus();
    startAutoRefresh();

    // Update sensors every 5 seconds
    setInterval(updateAllSensors, 5000);

    console.log('  ✓ Authentication system active');
    console.log('  ✓ IoT sensor simulation running');
    console.log('  ✓ Real-time monitoring enabled');
    console.log('  ✓ Role-based dashboards loaded');
    console.log('%c🚀 BinMaps fully initialized and ready!', 'font-size: 14px; font-weight: bold; color: #10b981');
});

// Animate counters on page load
window.addEventListener('load', () => {
    const heroTotalBins = document.getElementById('heroTotalBins');
    if (heroTotalBins) {
        animateCounter(heroTotalBins, 60);
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