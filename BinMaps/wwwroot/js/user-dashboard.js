// ===========================
// USER DASHBOARD JAVASCRIPT
// ===========================

document.addEventListener('DOMContentLoaded', () => {
    // Check if we're on the user dashboard page
    const userDashboard = document.getElementById('userDashboard');
    if (!userDashboard) return;
    
    initUserDashboard();
});

function initUserDashboard() {
    console.log('Initializing User Dashboard');
    
    updateUserStats();
    
    // Button handlers
    const buttons = {
        'userReportBtn': () => openModal('reportModal'),
        'userQuickReport': () => openModal('reportModal'),
        'viewMyReportsBtn': () => {
            toggleSection('myReportsSection');
            updateUserReportsList();
        },
        'viewNearbyBinsBtn': () => {
            toggleSection('nearbyBinsSection');
            setTimeout(() => initUserMap(), 100);
        },
        'userViewMap': () => {
            toggleSection('nearbyBinsSection');
            setTimeout(() => initUserMap(), 100);
        },
        'viewCommunityStatsBtn': () => {
            toggleSection('communityStatsSection');
            updateCommunityStats();
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
    
    // Show floating report button
    const floatingBtn = document.getElementById('floatingReportBtn');
    if (floatingBtn) floatingBtn.style.display = 'flex';
    
    // Setup report form
    setupReportForm();
}

function toggleSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (section) {
        const isVisible = section.style.display !== 'none';
        // Hide all sections first
        document.querySelectorAll('.reports-section, .map-section, .community-stats-section').forEach(s => {
            s.style.display = 'none';
        });
        // Toggle current section
        section.style.display = isVisible ? 'none' : 'block';
    }
}

function updateUserStats() {
    const savedUser = localStorage.getItem('binmaps_user');
    if (!savedUser) return;
    
    let currentUser;
    try {
        currentUser = JSON.parse(savedUser);
    } catch (e) {
        return;
    }
    
    const userReportsFiltered = userReports.filter(r => r.user === currentUser.name);
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
    const savedUser = localStorage.getItem('binmaps_user');
    if (!listContainer || !savedUser) return;
    
    let currentUser;
    try {
        currentUser = JSON.parse(savedUser);
    } catch (e) {
        return;
    }
    
    const userReportsFiltered = userReports.filter(r => r.user === currentUser.name);
    
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

function updateCommunityStats() {
    const totalReports = userReports.length;
    const resolvedReports = userReports.filter(r => r.status === 'resolved').length;
    
    const el1 = document.getElementById('communityTotalReports');
    const el2 = document.getElementById('communityResolvedReports');
    
    if (el1) el1.textContent = totalReports;
    if (el2) el2.textContent = resolvedReports;
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
            
            console.log('User heatmap initialized');
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
                    Bins in zone: ${zone.bins}<br>
                    Collections: ${zone.activity === 'high' ? '5-7/week' : zone.activity === 'medium' ? '3-4/week' : '1-2/week'}
                </div>
            </div>
        `);
    });
}

// ===========================
// REPORT FORM SUBMISSION
// ===========================
function setupReportForm() {
    const reportForm = document.getElementById('reportForm');
    if (!reportForm) return;
    
    reportForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const reportType = document.getElementById('reportType').value;
        const reportLocation = document.getElementById('reportLocation').value;
        const reportDescription = document.getElementById('reportDescription').value;
        
        const savedUser = localStorage.getItem('binmaps_user');
        let userName = 'Anonymous';
        if (savedUser) {
            try {
                const user = JSON.parse(savedUser);
                userName = user.name;
            } catch (e) {
                console.error('Error parsing user:', e);
            }
        }
        
        const newReport = {
            id: Date.now(),
            type: reportType,
            location: reportLocation,
            description: reportDescription,
            status: 'pending',
            timestamp: new Date().toISOString(),
            user: userName
        };
        
        userReports.push(newReport);
        localStorage.setItem('binmaps_reports', JSON.stringify(userReports));
        
        showNotification('Report submitted successfully!', 'success');
        reportForm.reset();
        
        const reportModal = document.getElementById('reportModal');
        if (reportModal) reportModal.classList.remove('active');
        
        // Update reports display
        updateUserReportsList();
        updateUserStats();
    });
}
