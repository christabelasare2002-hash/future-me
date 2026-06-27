

document.addEventListener('DOMContentLoaded', async () => {
    const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? 'http://127.0.0.1:5000/api'
        : 'https://your-production-backend-url.com/api'; // TODO: Replace with your actual hosted backend API URL

    
    

    const navDashboard = document.getElementById('nav-dashboard');
    const navUsers = document.getElementById('nav-users');
    const secDashboard = document.getElementById('sec-dashboard');
    const secUsers = document.getElementById('sec-users');
    const pageTitle = document.getElementById('page-title');

    
    const showDashboard = () => {
        navDashboard.classList.add('active');
        navUsers.classList.remove('active');
        secDashboard.classList.remove('hidden');
        secUsers.classList.add('hidden');
        pageTitle.textContent = "Analytics Overview";
        loadDashboard();
    };

    
    const showUsers = () => {
        navUsers.classList.add('active');
        navDashboard.classList.remove('active');
        secUsers.classList.remove('hidden');
        secDashboard.classList.add('hidden');
        pageTitle.textContent = "User Data Explorer";
        loadUsers();
    };

    navDashboard.onclick = showDashboard;
    navUsers.onclick = showUsers;

    
    const downloadReport = () => {
        window.location.href = `${API_URL}/admin/export/csv`;
    };

    document.getElementById('generate-report-btn').onclick = downloadReport;
    document.getElementById('dashboard-report-btn').onclick = downloadReport;

    
    showDashboard();

    
    async function loadDashboard() {
        try {
            const res = await fetch(`${API_URL}/admin/analytics`, { credentials: 'include' });
            
            const data = await res.json();
            
            
            document.getElementById('m-total').textContent = data.total_users || 0;
            document.getElementById('m-qualified').textContent = data.status_split.Qualified || 0;
            document.getElementById('m-diploma').textContent = data.suggestion_counts.Diploma || 0;
            document.getElementById('m-remedial').textContent = data.suggestion_counts.Remedial || 0;
            
            
            const demoList = document.getElementById('demo-list');
            let html = '';
            Object.entries(data.gender_split || {}).forEach(([k, v]) => {
                html += `<div style="display:flex; justify-content:space-between; padding:0.75rem 0; border-bottom:1px solid #f1f5f9;">
                    <span style="color:var(--secondary); font-weight:600;">${k}</span>
                    <span style="font-weight:700;">${v}</span>
                </div>`;
            });
            Object.entries(data.age_distribution || {}).forEach(([k, v]) => {
                html += `<div style="display:flex; justify-content:space-between; padding:0.75rem 0; border-bottom:1px solid #f1f5f9;">
                    <span style="color:var(--secondary); font-weight:600;">Age ${k}</span>
                    <span style="font-weight:700;">${v}</span>
                </div>`;
            });
            demoList.innerHTML = html || '<p style="color:var(--secondary);">No demographic data yet.</p>';

            
            const progsList = document.getElementById('progs-list');
            const topProgs = Object.entries(data.programme_selections || {}).sort((a,b) => b[1] - a[1]).slice(0, 5);
            progsList.innerHTML = topProgs.map(([k, v]) => `
                <div style="display:flex; justify-content:space-between; padding:0.75rem 0; border-bottom:1px solid #f1f5f9;">
                    <span style="color:var(--secondary); font-weight:600;">${k}</span>
                    <span style="font-weight:700; color:var(--accent);">${v} selections</span>
                </div>
            `).join('') || '<p style="color:var(--secondary);">No selections yet.</p>';
            
        } catch(e) { 
            console.error(e); 
        }
    }

    
    async function loadUsers() {
        try {
            const res = await fetch(`${API_URL}/admin/users`, { credentials: 'include' });
            const users = await res.json();
            
            const tbody = document.getElementById('users-tbody');
            if (users.length === 0) {
                tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:2rem; color:var(--secondary);">No assessments completed yet.</td></tr>';
                return;
            }

            tbody.innerHTML = users.map(u => {
                const p = u.profile || {};
                const date = new Date(u.timestamp).toLocaleDateString();
                const core = p.coreGrades || [];
                const elec = p.electiveGrades || [];
                const grades = [...core, ...elec].join(', ') || 'N/A';
                const progs = (p.selectedProgrammes || []).join(', ') || 'N/A';
                const name = p.name || 'Unknown';
                const email = p.email || 'N/A';
                const region = p.region || 'N/A';
                
                return `
                    <tr>
                        <td>${date}</td>
                        <td style="font-weight:700;">${name}</td>
                        <td style="color:var(--secondary);">${email}</td>
                        <td>${region}</td>
                        <td title="${grades}">${grades.length > 20 ? grades.substring(0, 17) + '...' : grades}</td>
                        <td title="${progs}">${progs.length > 20 ? progs.substring(0, 17) + '...' : progs}</td>
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
