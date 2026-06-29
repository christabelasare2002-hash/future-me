document.addEventListener('DOMContentLoaded', () => {
    const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? 'http://127.0.0.1:5000/api'
        : 'https://futureme-backend-pdv6.onrender.com/api'; // TODO: Replace with your actual hosted backend API URL

    const form = document.getElementById('admin-login-form');
    const errorDiv = document.getElementById('login-error');

    form.onsubmit = async (e) => {
        e.preventDefault();
        const username = document.getElementById('admin-username').value;
        const password = document.getElementById('admin-password').value;

        errorDiv.classList.add('hidden');

        try {
            const res = await fetch(`${API_URL}/admin/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
                credentials: 'include'
            });

            const data = await res.json();

            if (res.ok) {
                
                localStorage.setItem('admin_authenticated', 'true');
                window.location.href = 'admin.html';
            } else {
                errorDiv.textContent = data.error || "Invalid credentials.";
                errorDiv.classList.remove('hidden');
            }
        } catch (err) {
            errorDiv.textContent = "Server connection failed.";
            errorDiv.classList.remove('hidden');
        }
    };
});
