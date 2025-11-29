// ===========================
// AUTHENTICATION JAVASCRIPT
// ===========================

document.addEventListener('DOMContentLoaded', () => {
    // Login form handler
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            // Only prevent default if using demo accounts (not actual form submission)
            const email = document.getElementById('loginEmail').value;
            const password = document.getElementById('loginPassword').value;
            
            // Check if it's a demo account
            let foundUser = null;
            for (let key in demoAccounts) {
                if (demoAccounts[key].email === email && demoAccounts[key].password === password) {
                    e.preventDefault(); // Only prevent if demo account
                    foundUser = demoAccounts[key];
                    break;
                }
            }
            
            if (foundUser) {
                const rememberMe = document.getElementById('rememberMe')?.checked;
                currentUser = foundUser;
                if (rememberMe) {
                    localStorage.setItem('binmaps_user', JSON.stringify(currentUser));
                }
                showNotification(`Welcome back, ${currentUser.name}!`, 'success');
                
                // Redirect based on role
                setTimeout(() => {
                    if (currentUser.role === 'user') {
                        window.location.href = '/User/Dashboard';
                    } else if (currentUser.role === 'collector') {
                        window.location.href = '/Collector/Dashboard';
                    } else if (currentUser.role === 'admin') {
                        window.location.href = '/Admin/Dashboard';
                    }
                }, 500);
            }
            // If not demo account, let form submit normally to server
        });
    }

    // Demo account buttons
    document.querySelectorAll('.demo-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const role = this.getAttribute('data-role');
            currentUser = demoAccounts[role];
            localStorage.setItem('binmaps_user', JSON.stringify(currentUser));
            showNotification(`Logged in as ${currentUser.name}`, 'success');
            
            // Redirect based on role
            setTimeout(() => {
                if (currentUser.role === 'user') {
                    window.location.href = '/User/Dashboard';
                } else if (currentUser.role === 'collector') {
                    window.location.href = '/Collector/Dashboard';
                } else if (currentUser.role === 'admin') {
                    window.location.href = '/Admin/Dashboard';
                }
            }, 500);
        });
    });

    // Logout handler
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            localStorage.removeItem('binmaps_user');
            currentUser = null;
            collectedBins.clear();
            showNotification('Logged out successfully', 'info');
            setTimeout(() => {
                window.location.href = '/';
            }, 500);
        });
    }

    // Check if user is already logged in and update navbar
    const savedUser = localStorage.getItem('binmaps_user');
    if (savedUser) {
        try {
            currentUser = JSON.parse(savedUser);
            updateNavbar(currentUser);
        } catch (e) {
            console.error('Error parsing saved user:', e);
            localStorage.removeItem('binmaps_user');
        }
    }
});

// Update navbar with user info
function updateNavbar(user) {
    const navbar = document.getElementById('navbar');
    const userRoleEl = document.getElementById('userRole');
    const userNameEl = document.getElementById('userName');
    const navLinks = document.getElementById('navLinks');
    
    if (navbar && user) {
        navbar.style.display = 'block';
        
        if (userRoleEl) userRoleEl.textContent = user.role.toUpperCase();
        if (userNameEl) userNameEl.textContent = user.name;
        
        // Update navigation links based on role
        if (navLinks) {
            navLinks.innerHTML = '';
            
            if (user.role === 'user') {
                navLinks.innerHTML = `
                    <li><a href="/User/Dashboard">Home</a></li>
                    <li><a href="#" id="navReportIssue">Report Issue</a></li>
                    <li><a href="#" id="navMyReports">My Reports</a></li>
                    <li><a href="#" id="navNearbyBins">Zone Heatmap</a></li>
                `;
            } else if (user.role === 'collector') {
                navLinks.innerHTML = `
                    <li><a href="/Collector/Dashboard">Home</a></li>
                    <li><a href="#" id="navTodayRoute">Today's Route</a></li>
                    <li><a href="#" id="navHeatmap">Bin Map</a></li>
                `;
            } else if (user.role === 'admin') {
                navLinks.innerHTML = `
                    <li><a href="/Admin/Dashboard">Home</a></li>
                    <li><a href="#dashboard">Dashboard</a></li>
                    <li><a href="#map">Live Map</a></li>
                    <li><a href="#analytics">Analytics</a></li>
                `;
            }
        }
    }
}
