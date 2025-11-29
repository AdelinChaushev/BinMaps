// ===========================
// ADMIN DASHBOARD JAVASCRIPT
// ===========================

document.addEventListener('DOMContentLoaded', () => {
    // Check if we're on the admin dashboard page
    const adminDashboard = document.getElementById('adminDashboard');
    if (!adminDashboard) return;
    
    initAdminDashboard();
});

function initAdminDashboard() {
    console.log('Initializing Admin Dashboard');
    
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
        btn.addEventListener('click', function() {
            document.querySelectorAll('.map-filter-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            const filter = this.getAttribute('data-filter');
            displayAdminBins(filter);
        });
    });
    
    // Report filter buttons
    document.querySelectorAll('.reports-filters .filter-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.reports-filters .filter-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            const filter = this.getAttribute('data-filter');
            filterAdminReports(filter);
        });
    });
    
    // Route view buttons
    document.querySelectorAll('.route-view-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            displayAdminRoute();
        });
    });
    
    // Time period buttons
    document.querySelectorAll('.time-btn').forEach(button => {
        button.addEventListener('click', function() {
            document.querySelectorAll('.time-btn').forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            
            const period = this.textContent;
            showNotification(`Showing data for ${period} period`, 'info');
        });
    });
    
    // Initialize maps and charts after delay
    setTimeout(() => {
        initAdminMap();
        initHeatmap();
        initAdminCharts();
    }, 500);
    
    // Update map every 5 seconds
    setInterval(() => {
        if (adminMap) {
            const activeFilter = document.querySelector('.map-filter-btn.active')?.getAttribute('data-filter') || 'all';
            displayAdminBins(activeFilter);
        }
    }, 5000);
    
    // Check for fire risk
    setInterval(() => {
        checkFireRisk();
    }, 10000);
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
            
            console.log('Admin map initialized');
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
                        <strong>${bin.fillLevel.toFixed(1)}%</strong> Full
                    </div>
                    <div style="margin-top: 0.3rem; font-size: 0.9rem; color: #64748b;">
                        Status: ${bin.status.charAt(0).toUpperCase() + bin.status.slice(1)}
                    </div>
                    <div style="margin-top: 0.3rem; font-size: 0.9rem; color: #64748b;">
                        Temperature: ${bin.temperature}°C
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
                { name: 'Zone F', lat: 42.605, lng: 25.400, activity: 'low', bins: 6 }
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
            
            console.log('Heatmap initialized');
        } catch (error) {
            console.error('Error initializing heatmap:', error);
        }
    }, 200);
}

// ===========================
// ADMIN REPORTS & ALERTS
// ===========================
function loadAdminReports() {
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
                            <p>${report.location} • ${date} • By ${report.user}</p>
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
    // Add new alerts periodically
    setInterval(() => {
        generateRandomAlert();
    }, 15000);
}

function generateRandomAlert() {
    const alerts = [
        { type: 'info', title: 'Route Optimization', message: 'New optimal route found for zone 3' },
        { type: 'warning', title: 'Overflow Warning', message: 'Container #27 needs attention within 90 minutes' },
        { type: 'success', title: 'Efficiency Gain', message: 'Fuel consumption decreased by 15% this week' }
    ];
    
    const alert = alerts[Math.floor(Math.random() * alerts.length)];
    addAlert(alert);
}

function addAlert(alertData) {
    const container = document.getElementById('adminAlertsContainer');
    if (!container) return;
    
    const alertHTML = `
        <div class="alert-card ${alertData.type}" style="animation: slideIn 0.5s ease-out;">
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

function checkFireRisk() {
    containerData.forEach(bin => {
        if (bin.temperature > 45) {
            const existingAlerts = document.querySelectorAll('.alert-card');
            const hasFireAlert = Array.from(existingAlerts).some(alert => 
                alert.textContent.includes(`Container #${bin.id}`) && 
                alert.textContent.includes('FIRE')
            );
            
            if (!hasFireAlert) {
                addAlert({
                    type: 'warning',
                    title: 'FIRE RISK DETECTED',
                    message: `Container #${bin.id} temperature critical: ${bin.temperature}°C! Immediate action required.`
                });
                
                console.warn(`FIRE RISK: Container #${bin.id} at ${bin.temperature}°C`);
            }
        }
    });
}

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
        updateFillLevelChart();
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
        console.log('Fill level chart initialized');
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
        console.log('Efficiency chart initialized');
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
        console.log('History chart initialized');
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
        console.log('Temperature chart initialized');
    } catch (error) {
        console.error('Error creating temperature chart:', error);
    }
}
