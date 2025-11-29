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
// SENSOR SIMULATION CLASSES
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

// Initialize sensor network
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
    console.log('Sensors initialized:', containerData.length);
}

// Update all sensors
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
document.addEventListener('DOMContentLoaded', () => {
    console.log('%cBinMaps - Smart Waste Management System', 'font-size: 20px; font-weight: bold; color: #10b981');
    console.log('%cSystem Status:', 'font-size: 14px; font-weight: bold; color: #3b82f6');
    
    // Initialize core systems
    initializeSensors();
    loadSavedReports();
    
    // Update sensors every 5 seconds
    setInterval(updateAllSensors, 5000);
    
    console.log('  ✓ IoT sensor simulation running');
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
