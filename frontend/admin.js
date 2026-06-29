

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Auth Check - Redirect if not authenticated
    if (localStorage.getItem('admin_authenticated') !== 'true') {
        window.location.href = 'admin_login.html';
        return;
    }

    const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? 'http://127.0.0.1:5000/api'
        : 'https://futureme-backend-pdv6.onrender.com/api';

    const navDashboard = document.getElementById('nav-dashboard');
    const navUsers = document.getElementById('nav-users');
    const secDashboard = document.getElementById('sec-dashboard');
    const secUsers = document.getElementById('sec-users');
    const pageTitle = document.getElementById('page-title');

    // Mobile Sidebar Elements
    const sidebar = document.getElementById('admin-sidebar');
    const toggleBtn = document.getElementById('sidebar-toggle');
    const overlay = document.getElementById('sidebar-overlay');
    const logoutBtn = document.getElementById('btn-logout');

    // Toggle Sidebar on mobile
    if (toggleBtn && sidebar && overlay) {
        toggleBtn.onclick = () => {
            sidebar.classList.add('open');
            overlay.classList.add('active');
        };
        overlay.onclick = () => {
            sidebar.classList.remove('open');
            overlay.classList.remove('active');
        };
    }

    // Logout logic
    if (logoutBtn) {
        logoutBtn.onclick = () => {
            localStorage.removeItem('admin_authenticated');
            window.location.href = 'admin_login.html';
        };
    }

    // Program mapping table loaded dynamically
    let programmeMap = {};
    const loadProgrammes = async () => {
        try {
            const res = await fetch(`${API_URL}/programmes`);
            if (res.ok) {
                const programmes = await res.json();
                programmes.forEach(p => {
                    programmeMap[p.id] = p.name;
                });
            }
        } catch (e) {
            console.error("Failed to load program dictionary:", e);
        }
    };

    const showDashboard = () => {
        navDashboard.classList.add('active');
        navUsers.classList.remove('active');
        secDashboard.classList.remove('hidden');
        secUsers.classList.add('hidden');
        pageTitle.textContent = "Analytics Overview";
        loadDashboard();
        
        // Close sidebar drawer on selection in mobile view
        if (sidebar && overlay) {
            sidebar.classList.remove('open');
            overlay.classList.remove('active');
        }
    };

    const showUsers = () => {
        navUsers.classList.add('active');
        navDashboard.classList.remove('active');
        secUsers.classList.remove('hidden');
        secDashboard.classList.add('hidden');
        pageTitle.textContent = "User Data Explorer";
        loadUsers();

        // Close sidebar drawer on selection in mobile view
        if (sidebar && overlay) {
            sidebar.classList.remove('open');
            overlay.classList.remove('active');
        }
    };

    navDashboard.onclick = showDashboard;
    navUsers.onclick = showUsers;

    const downloadReport = () => {
        window.location.href = `${API_URL}/admin/export/csv`;
    };

    document.getElementById('generate-report-btn').onclick = downloadReport;
    document.getElementById('dashboard-report-btn').onclick = downloadReport;

    // Load initial data
    await loadProgrammes();
    showDashboard();

    async function loadDashboard() {
        try {
            const res = await fetch(`${API_URL}/admin/analytics`, { credentials: 'include' });
            if (!res.ok) throw new Error("Failed to fetch analytics");
            const data = await res.json();
            
            // Metrics
            document.getElementById('m-total').textContent = data.total_users || 0;
            document.getElementById('m-qualified').textContent = (data.status_split && data.status_split.Qualified) || 0;
            document.getElementById('m-diploma').textContent = (data.suggestion_counts && data.suggestion_counts.Diploma) || 0;
            document.getElementById('m-remedial').textContent = (data.suggestion_counts && data.suggestion_counts.Remedial) || 0;
            
            // Demographics List (Polished Progress Bars)
            const demoList = document.getElementById('demo-list');
            let html = '';
            const total = data.total_users || 1;

            // Gender split
            if (data.gender_split) {
                Object.entries(data.gender_split).forEach(([k, v]) => {
                    const pct = Math.round((v / total) * 100);
                    html += `
                    <div style="margin-bottom: 1.25rem;">
                        <div style="display:flex; justify-content:space-between; margin-bottom: 0.35rem;">
                            <span style="color:#475569; font-weight:600; font-size:0.9rem;">${k}</span>
                            <span style="font-weight:700; font-size:0.9rem;">${v} <span style="font-weight:500; color:var(--secondary); font-size:0.8rem; margin-left:0.25rem;">(${pct}%)</span></span>
                        </div>
                        <div style="height: 6px; background: #e2e8f0; border-radius: 3px; overflow: hidden;">
                            <div style="height: 100%; width: ${pct}%; background: var(--accent); border-radius: 3px;"></div>
                        </div>
                    </div>`;
                });
            }

            // Age distribution
            if (data.age_distribution) {
                Object.entries(data.age_distribution).forEach(([k, v]) => {
                    const pct = Math.round((v / total) * 100);
                    html += `
                    <div style="margin-bottom: 1.25rem;">
                        <div style="display:flex; justify-content:space-between; margin-bottom: 0.35rem;">
                            <span style="color:#475569; font-weight:600; font-size:0.9rem;">Age ${k}</span>
                            <span style="font-weight:700; font-size:0.9rem;">${v} <span style="font-weight:500; color:var(--secondary); font-size:0.8rem; margin-left:0.25rem;">(${pct}%)</span></span>
                        </div>
                        <div style="height: 6px; background: #e2e8f0; border-radius: 3px; overflow: hidden;">
                            <div style="height: 100%; width: ${pct}%; background: #0ea5e9; border-radius: 3px;"></div>
                        </div>
                    </div>`;
                });
            }
            demoList.innerHTML = html || '<p style="color:var(--secondary);">No demographic data yet.</p>';

            // Top Programme Selections (Polished Progress Bars)
            const progsList = document.getElementById('progs-list');
            const selections = data.programme_selections || {};
            const topProgs = Object.entries(selections).sort((a,b) => b[1] - a[1]).slice(0, 5);
            const maxVal = topProgs.length > 0 ? topProgs[0][1] : 1;

            progsList.innerHTML = topProgs.map(([k, v]) => {
                const name = programmeMap[k] || k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
                const pct = maxVal > 0 ? Math.round((v / maxVal) * 100) : 0;
                return `
                    <div style="margin-bottom: 1.25rem;">
                        <div style="display:flex; justify-content:space-between; margin-bottom: 0.35rem;">
                            <span style="color:#475569; font-weight:600; font-size:0.9rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 260px;" title="${name}">${name}</span>
                            <span style="font-weight:700; font-size:0.9rem; color:var(--accent); flex-shrink: 0; margin-left: 1rem;">${v} <span style="font-weight:500; color:var(--secondary); font-size:0.8rem; margin-left:0.25rem;">selections</span></span>
                        </div>
                        <div style="height: 6px; background: #e2e8f0; border-radius: 3px; overflow: hidden;">
                            <div style="height: 100%; width: ${pct}%; background: var(--gradient-accent); border-radius: 3px;"></div>
                        </div>
                    </div>
                `;
            }).join('') || '<p style="color:var(--secondary);">No selections yet.</p>';
            
        } catch(e) { 
            console.error(e); 
        }
    }

    async function loadUsers() {
        try {
            const res = await fetch(`${API_URL}/admin/users`, { credentials: 'include' });
            if (!res.ok) throw new Error("Failed to fetch users");
            const users = await res.json();
            
            const tbody = document.getElementById('users-tbody');
            if (users.length === 0) {
                tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:2rem; color:var(--secondary); font-weight:500;">No assessments completed yet.</td></tr>';
                return;
            }

            tbody.innerHTML = users.map(u => {
                const p = u.profile || {};
                const date = new Date(u.timestamp).toLocaleDateString();
                const core = p.coreGrades || [];
                const elec = p.electiveGrades || [];
                const grades = [...core, ...elec].join(', ') || 'N/A';
                
                // Map program IDs to human readable names
                const rawProgs = p.selectedProgrammes || [];
                const mappedProgs = rawProgs.map(pid => programmeMap[pid] || pid);
                const progs = mappedProgs.join(', ') || 'N/A';
                
                const name = p.name || 'Unknown';
                const email = p.email || 'N/A';
                const region = p.region || 'N/A';
                
                return `
                    <tr>
                        <td style="white-space: nowrap;">${date}</td>
                        <td style="font-weight:700; color:var(--primary);">${name}</td>
                        <td style="color:var(--secondary);">${email}</td>
                        <td>${region}</td>
                        <td title="${grades}" style="font-family: monospace; font-size: 0.85rem; letter-spacing: 0.02em;">${grades.length > 20 ? grades.substring(0, 17) + '...' : grades}</td>
                        <td title="${progs}">${progs.length > 25 ? progs.substring(0, 22) + '...' : progs}</td>
                        <td>
                            <span class="status-pill ${p.is_qualified ? 'status-fully-qualified' : 'status-unqualified'}">
                                ${p.is_qualified ? 'Qualified' : 'Not Qualified'}
                            </span>
                        </td>
                    </tr>
                `;
            }).join('');
        } catch(e) { 
            console.error(e); 
        }
    }
});

