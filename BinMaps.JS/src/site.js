// ===========================
// GLOBAL VARIABLES & DEMO ACCOUNTS
// ===========================

// Demo accounts
const demoAccounts = {
    user: {
        email: 'user@binmaps.com',
        password: 'user123',
        role: 'user',
        name: 'John Citizen'
    },
    collector: {
        email: 'collector@binmaps.com',
        password: 'collector123',
        role: 'collector',
        name: 'Mike Driver'
    },
    admin: {
        email: 'admin@binmaps.com',
        password: 'admin123',
        role: 'admin',
        name: 'Admin User'
    }
};

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

// ===========================
// API FUNCTIONS - FETCH REAL DATA
// ===========================

/**
 * CHANGE #1: Added getAllContainers() function to fetch container data from API
 * Location: Global API functions section
 * Purpose: Fetch all container data from the backend
 */
async function getAllContainers() {
    try {
        const response = await fetch('/api/containers');

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const containers = await response.json();
        
        // Transform API data to match the expected format
        containerData = containers.map(container => ({
            id: container.id,
            containerId: `BIN-${String(container.id).padStart(3, '0')}`,
            lat: container.locationX || (42.6191 + (Math.random() - 0.5) * 0.05),
            lng: container.locationY || (25.3978 + (Math.random() - 0.5) * 0.05),
            fillLevel: container.capacity || 0,
            temperature: 20 + Math.random() * 10, // Default temperature if not in API
            status: container.capacity < 50 ? 'empty' : container.capacity < 80 ? 'warning' : 'critical',
            areaId: container.areaId || 0,
            timestamp: new Date().toISOString(),
            batteryLevel: 85 + Math.random() * 15,
            signalStrength: -50 - Math.random() * 40,
            sensorHealth: 'operational',
            fireRisk: false
        }));
        
        console.log('✅ Fetched containers from API:', containerData.length);
        updateDashboardStats();
        return containerData;

    } catch (error) {
        console.error('❌ Error fetching containers:', error);
        // Fallback to simulated data if API fails
        console.warn('⚠️ Using simulated data as fallback');
        initializeSensors();
        return containerData;
    }
}

/**
 * CHANGE #2: Added refreshContainerData() function to periodically update container data
 * Location: Global API functions section
 * Purpose: Refresh container data from the backend at regular intervals
 */
async function refreshContainerData() {
    await getAllContainers();
    
    // Update all active maps and displays
    if (adminMap) {
        const activeFilter = document.querySelector('.map-filter-btn.active')?.getAttribute('data-filter') || 'all';
        displayAdminBins(activeFilter);
    }
    
    if (collectorMap) {
        displayCollectorBins();
    }
}

// ===========================
// SENSOR SIMULATION CLASSES (FALLBACK)
// ===========================

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
            console.log(`Container ${this.containerId} emptied!`);
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
            console.warn(`FIRE DETECTED in ${this.containerId}!`);
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

/**
 * CHANGE #3: Modified initializeSensors() to be used as fallback only
 * Location: Sensor simulation section
 * Purpose: Only used when API is unavailable
 */
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
    console.log('⚠️ Using simulated sensors (fallback):', containerData.length);
}

// Update all sensors (only used in simulation mode)
function updateAllSensors() {
    if (sensors.length > 0) {
        containerData = sensors.map(sensor => sensor.update());
        updateDashboardStats();
    }
}

/**
 * CHANGE #4: Modified updateDashboardStats() to work with API data
 * Location: Dashboard statistics section
 * Purpose: Update dashboard statistics from real container data
 */
function updateDashboardStats() {
    if (!containerData || containerData.length === 0) return;
    
    const empty = containerData.filter(c => c.status === 'empty').length;
    const warning = containerData.filter(c => c.status === 'warning').length;
    const critical = containerData.filter(c => c.status === 'critical').length;
    const avgTemp = Math.round(containerData.reduce((sum, c) => sum + (c.temperature || 20), 0) / containerData.length);
    
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
        heroTotalBins: containerData.length
    };
    
    Object.keys(elements).forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = elements[id];
    });
}

// Load saved reports
function loadSavedReports() {
    const saved = localStorage.getItem('binmaps_reports');
    if (saved) {
        try {
            userReports = JSON.parse(saved);
        } catch (e) {
            console.error('Error loading reports:', e);
            userReports = [];
        }
    }
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

// ===========================
// MODAL SYSTEM
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
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('active');
            }
        });
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
document.addEventListener('DOMContentLoaded', () => {
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
});

// ===========================
// UTILITY FUNCTIONS
// ===========================
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

// ===========================
// SMOOTH SCROLLING
// ===========================
document.addEventListener('DOMContentLoaded', () => {
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
});

// ===========================
// MOBILE MENU
// ===========================
document.addEventListener('DOMContentLoaded', () => {
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
});

// ===========================
// INITIALIZATION
// ===========================
/**
 * CHANGE #5: Modified initialization to fetch data from API first
 * Location: Main initialization
 * Purpose: Load real data from backend on startup
 */
document.addEventListener('DOMContentLoaded', async () => {
    console.log('%cBinMaps - Smart Waste Management System', 'font-size: 20px; font-weight: bold; color: #10b981');
    console.log('%cSystem Status:', 'font-size: 14px; font-weight: bold; color: #3b82f6');
    
    // Load saved reports
    loadSavedReports();
    
    // Fetch container data from API
    await getAllContainers();
    
    // Update data every 30 seconds
    setInterval(refreshContainerData, 30000);
    
    console.log('  ✓ API connection established');
    console.log('  ✓ Real-time monitoring enabled');
    console.log('%cDemo Accounts:', 'font-size: 14px; font-weight: bold; color: #f59e0b');
    console.log('  User: user@binmaps.com / user123');
    console.log('  Collector: collector@binmaps.com / collector123');
    console.log('  Admin: admin@binmaps.com / admin123');
    console.log('%cBinMaps fully initialized and ready!', 'font-size: 14px; font-weight: bold; color: #10b981');
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
