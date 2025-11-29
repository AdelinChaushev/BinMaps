document.addEventListener('DOMContentLoaded', () => {
    // Login form handler
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', function (e) {
            e.preventDefault(); // Always prevent default for client-side handling

            const email = document.getElementById('loginEmail').value.trim();
            const password = document.getElementById('loginPassword').value;
            const rememberMe = document.getElementById('rememberMe')?.checked;

            let foundUser = null;

            // First, check demo accounts
            for (let key in demoAccounts) {
                if (demoAccounts[key].email === email && demoAccounts[key].password === password) {
                    foundUser = demoAccounts[key];
                    break;
                }
            }

            // If not a demo account, check registered users
            if (!foundUser) {
                const registeredUsers = getRegisteredUsers();
                const registered = registeredUsers.find(user =>
                    user.email.toLowerCase() === email.toLowerCase() &&
                    user.password === password &&
                    user.isActive
                );

                if (registered) {
                    foundUser = {
                        email: registered.email,
                        password: registered.password,
                        role: registered.role,
                        name: registered.fullName
                    };
                }
            }

            if (foundUser) {
                currentUser = foundUser;
                if (rememberMe) {
                    localStorage.setItem('binmaps_user', JSON.stringify(currentUser));
                } else {
                    sessionStorage.setItem('binmaps_user', JSON.stringify(currentUser));
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
            } else {
                showNotification('Invalid email or password', 'warning');
            }
        });
    }

    // Demo account buttons
    document.querySelectorAll('.demo-btn').forEach(btn => {
        btn.addEventListener('click', function () {
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
        logoutBtn.addEventListener('click', function () {
            localStorage.removeItem('binmaps_user');
            sessionStorage.removeItem('binmaps_user');
            currentUser = null;
            collectedBins.clear();
            showNotification('Logged out successfully', 'info');
            setTimeout(() => {
                window.location.href = '/';
            }, 500);
        });
    }

    // Check if user is already logged in and update navbar
    const savedUser = localStorage.getItem('binmaps_user') || sessionStorage.getItem('binmaps_user');
    if (savedUser) {
        try {
            currentUser = JSON.parse(savedUser);
            updateNavbar(currentUser);
        } catch (e) {
            console.error('Error parsing saved user:', e);
            localStorage.removeItem('binmaps_user');
            sessionStorage.removeItem('binmaps_user');
            updateNavbar(null);
        }
    } else {
        // No user logged in - show default navbar
        updateNavbar(null);
    }
});

// Helper function to get registered users from localStorage
function getRegisteredUsers() {
    const users = localStorage.getItem('binmaps_registered_users');
    if (users) {
        try {
            return JSON.parse(users);
        } catch (e) {
            console.error('Error parsing registered users:', e);
            return [];
        }
    }
    return [];
}

// Update navbar with user info
function updateNavbar(user) {
    const navbar = document.getElementById('navbar');
    const userRoleEl = document.getElementById('userRole');
    const userNameEl = document.getElementById('userName');
    const navLinks = document.getElementById('navLinks');
    const userInfo = document.querySelector('.user-info');
    const logoutBtn = document.getElementById('logoutBtn');

    if (navbar) {
        navbar.style.display = 'block';
    }

    if (user) {
        // User is logged in - show user info and role-specific nav
        if (userInfo) userInfo.style.display = 'flex';
        if (logoutBtn) logoutBtn.style.display = 'flex';
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
    } else {
    
        if (userInfo) userInfo.style.display = 'none';
        if (logoutBtn) logoutBtn.style.display = 'none';

        if (navLinks) {
            navLinks.innerHTML = `
                <li><a href="/">Home</a></li>
                <li><a href="#features">Features</a></li>
                <li><a href="#impact">Impact</a></li>
                <li><a href="/Account/Login">Sign In</a></li>
            `;
        }
    }
}