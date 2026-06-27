

document.addEventListener('DOMContentLoaded', async () => {
    const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? 'http://127.0.0.1:5000/api'
        : 'https://your-production-backend-url.com/api'; // TODO: Replace with your actual hosted backend API URL


    async function secureFetch(url, options = {}) {
        options.credentials = 'include';
        if (options.body && typeof options.body === 'object') {
            options.body = JSON.stringify(options.body);
            options.headers = { ...options.headers, 'Content-Type': 'application/json' };
        }
        return fetch(url, options);
    }

    const handleLogout = async (e) => {
        if (e) e.preventDefault();
        if (confirm("Are you sure you want to log out? Your progress will be lost and the session will end.")) {
            localStorage.removeItem('futureme_results');
            try {
                await secureFetch(`${API_URL}/auth/logout`, { method: 'POST' });
            } catch (e) {}
            window.location.href = 'index.html';
        }
    };

    const initAuth = async () => {
        const logoutLink = document.getElementById('logout-link');
        const userDisplay = document.getElementById('user-display');
        const openRegBtn = document.getElementById('open-registration');
        const heroGetStarted = document.getElementById('hero-get-started');

        try {
            const res = await secureFetch(`${API_URL}/auth/check`);
            if (res.ok) {
                const data = await res.json();
                
                
                if (userDisplay) {
                    userDisplay.textContent = `Hi, ${data.name.split(' ')[0]}`;
                    userDisplay.classList.remove('hidden');
                }
                
                if (logoutLink) {
                    logoutLink.classList.remove('hidden');
                    logoutLink.onclick = handleLogout;
                }
                
                
                if (openRegBtn) openRegBtn.classList.add('hidden');
                if (heroGetStarted) {
                    heroGetStarted.textContent = "Continue Assessment";
                    heroGetStarted.onclick = () => window.location.href = 'tool.html';
                }
                return data;
            } else {
                
                if (userDisplay) userDisplay.classList.add('hidden');
                if (logoutLink) logoutLink.classList.add('hidden');
                if (openRegBtn) openRegBtn.classList.remove('hidden');
            }
        } catch (e) {
            console.log("Not authenticated.");
        }
        return null;
    };

    const authState = await initAuth();

    
    
    
    const modal = document.getElementById('registration-modal');
    if (modal) {
        const openRegBtns = [
            document.getElementById('open-registration'), 
            document.getElementById('hero-get-started')
        ];
        const closeModal = document.getElementById('close-modal');
        const tokenSection = document.getElementById('token-input-section');
        const regInputs = document.getElementById('user-details-inputs');
        const regActions = document.getElementById('registration-actions');
        const returningUserLink = document.getElementById('returning-user-link');
        const backToRegLink = document.getElementById('back-to-reg-link');
        const regError = document.getElementById('reg-error');
        const getTokenBtn = document.getElementById('get-token-btn');
        const verifyBtn = document.getElementById('verify-btn');

        const openModal = () => modal.classList.remove('hidden');
        const hideModal = () => {
            modal.classList.add('hidden');
            regInputs.classList.remove('hidden');
            regActions.classList.remove('hidden');
            tokenSection.classList.add('hidden');
            regError.classList.add('hidden');
            verifyBtn.textContent = "Verify & Continue";
            verifyBtn.style.background = "";
        };

        openRegBtns.forEach(btn => { if (btn) btn.onclick = openModal; });
        if (closeModal) closeModal.onclick = hideModal;

        returningUserLink.onclick = (e) => {
            e.preventDefault();
            regInputs.classList.add('hidden');
            regActions.classList.add('hidden');
            tokenSection.classList.remove('hidden');
        };

        backToRegLink.onclick = (e) => {
            e.preventDefault();
            regInputs.classList.remove('hidden');
            regActions.classList.remove('hidden');
            tokenSection.classList.add('hidden');
        };

        getTokenBtn.onclick = async () => {
            const name = document.getElementById('reg-name').value;
            const email = document.getElementById('reg-email').value;
            
            if (!name || !email) return alert("Please fill in both name and email.");
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return alert("Please enter a valid email address.");
            
            getTokenBtn.disabled = true;
            getTokenBtn.textContent = "Sending...";
            
            try {
                const res = await secureFetch(`${API_URL}/tokens/generate`, { method: 'POST', body: { name, email } });
                const data = await res.json();
                if (data.token) {
                    tokenSection.classList.remove('hidden');
                    regActions.classList.add('hidden');
                    regInputs.classList.add('hidden');
                    if (!data.email_sent) {
                        alert(`DEMO MODE: Your Token is: ${data.token}`);
                    } else {
                        alert("Token sent to your email!");
                    }
                } else alert(data.error || "Failed.");
            } catch (e) { 
                console.error(e); 
            } finally { 
                getTokenBtn.disabled = false; 
                getTokenBtn.textContent = "Get Token"; 
            }
        };

        verifyBtn.onclick = async () => {
            const token = document.getElementById('verify-token').value;
            if (!token) return alert("Enter token.");
            
            verifyBtn.disabled = true;
            regError.classList.add('hidden');
            try {
                const res = await secureFetch(`${API_URL}/tokens/verify`, { method: 'POST', body: { token } });
                const data = await res.json();
                if (data.status === 'verified') {
                    verifyBtn.textContent = "Verified ✓";
                    verifyBtn.style.background = "var(--success)";
                    setTimeout(() => window.location.href = 'tool.html', 500);
                } else {
                    regError.textContent = data.error;
                    regError.classList.remove('hidden');
                }
            } catch (e) { 
                console.error(e); 
            } finally { 
                verifyBtn.disabled = false; 
            }
        };
    }

    
    
    
    const form = document.getElementById('grade-form');
    if (form) {
        let authName = "";
        let authEmail = "";

        const formatTwo = (value) => value.toString().padStart(2, '0');

        const getDobValue = () => {
            const day = document.getElementById('dob-day')?.value;
            const month = document.getElementById('dob-month')?.value;
            const year = document.getElementById('dob-year')?.value;
            if (!day || !month || !year) return "";
            return `${year}-${formatTwo(month)}-${formatTwo(day)}`;
        };

        const getDaysInMonth = (year, month) => new Date(year, month, 0).getDate();

        const populateDobSelectors = () => {
            const daySelect = document.getElementById('dob-day');
            const monthSelect = document.getElementById('dob-month');
            const yearSelect = document.getElementById('dob-year');
            if (!daySelect || !monthSelect || !yearSelect) return;

            const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
            daySelect.innerHTML = '<option value="" disabled selected>Day</option>' +
                Array.from({ length: 31 }, (_, i) => `<option value="${i + 1}">${i + 1}</option>`).join('');
            monthSelect.innerHTML = '<option value="" disabled selected>Month</option>' + monthNames.map((name, index) => `<option value="${index + 1}">${name}</option>`).join('');

            const currentYear = new Date().getFullYear();
            const minAge = 15;
            const maxAge = 90;
            yearSelect.innerHTML = '<option value="" disabled selected>Year</option>';
            for (let year = currentYear - minAge; year >= currentYear - maxAge; year--) {
                yearSelect.insertAdjacentHTML('beforeend', `<option value="${year}">${year}</option>`);
            }

            const updateDayOptions = () => {
                const selectedDay = Number(daySelect.value);
                const month = Number(monthSelect.value);
                const year = Number(yearSelect.value) || new Date().getFullYear();
                if (!month) return;

                const daysInMonth = getDaysInMonth(year, month);
                const preservedDay = selectedDay > 0 && selectedDay <= daysInMonth ? selectedDay : null;
                daySelect.innerHTML = '<option value="" disabled selected>Day</option>';
                for (let day = 1; day <= daysInMonth; day++) {
                    const selected = day === preservedDay ? ' selected' : '';
                    daySelect.insertAdjacentHTML('beforeend', `<option value="${day}"${selected}>${day}</option>`);
                }
            };

            monthSelect.addEventListener('change', updateDayOptions);
            yearSelect.addEventListener('change', updateDayOptions);
        };

        const calculateAge = (dobValue) => {
            if (!dobValue) return -1;
            const dobDate = new Date(dobValue);
            const today = new Date();
            let years = today.getFullYear() - dobDate.getFullYear();
            const monthDiff = today.getMonth() - dobDate.getMonth();
            if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dobDate.getDate())) {
                years -= 1;
            }
            return years;
        };

        populateDobSelectors();
        if (authState) {
            authName = authState.name;
            authEmail = authState.email;
            document.getElementById('applicant-name').value = authName;
            document.getElementById('applicant-email').value = authEmail;
        }

        
        const savedResults = localStorage.getItem('futureme_results');
        if (savedResults) {
            try {
                displayResults(JSON.parse(savedResults), false);
            } catch (e) {
                localStorage.removeItem('futureme_results');
            }
        }

        const progressBar = document.getElementById('progress-bar');
        const steps = document.querySelectorAll('.form-step');
        const stepLabels = document.querySelectorAll('.step-label');
        let currentStep = 1;

        const updateUI = (step) => {
            steps.forEach((s, i) => s.classList.toggle('hidden', i + 1 !== step));
            stepLabels.forEach((l, i) => l.classList.toggle('active', i + 1 <= step));
            progressBar.style.width = `${(step / 4) * 100}%`;
            window.scrollTo(0, 0);
        };

        document.querySelectorAll('.next-step-btn').forEach(btn => {
            btn.onclick = () => {
                const next = parseInt(btn.dataset.next);
                if (next === 2) {
                    const phoneValue = document.getElementById('applicant-phone').value.trim();
                    const dobValue = getDobValue();
                    const numericPhone = phoneValue.replace(/\D/g, '');
                    if (!phoneValue || !dobValue) {
                        return alert("Please fill all profile fields.");
                    }
                    if (!/^\d{10}$/.test(numericPhone)) {
                        return alert("Phone number must be exactly 10 digits.");
                    }
                    if (new Date(dobValue) > new Date()) {
                        return alert("Date of birth cannot be in the future.");
                    }
                }
                currentStep = next;
                updateUI(currentStep);
            };
        });

        document.querySelectorAll('.prev-step-btn').forEach(btn => {
            btn.onclick = () => { currentStep = parseInt(btn.dataset.prev); updateUI(currentStep); };
        });

        document.querySelectorAll('.exit-btn').forEach(btn => {
            btn.onclick = handleLogout;
        });

        const careerInterests = [
            "Business & Entrepreneurship", "Finance & Accounting", "Technology & Data", 
            "Artificial Intelligence", "Cybersecurity", "Communication & Media", 
            "Law & Governance", "Logistics & Supply Chain", "Health & Social Services", 
            "Creative Arts & Design", "Engineering & Technical Fields", "Agriculture & Environment", 
            "Hospitality & Tourism", "Education & Training", "Security & Defense", "Aviation & Transport"
        ];
        const interestsGrid = document.getElementById('career-interests-grid');
        interestsGrid.innerHTML = careerInterests.map(interest => `
            <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer; font-size: 0.85rem; font-weight: 500;">
                <input type="checkbox" name="careerInterest" value="${interest}" style="width: 18px; height: 18px;">
                ${interest}
            </label>
        `).join('');

        let selectedProgs = [];
        const grid = document.getElementById('programme-selection-grid');
        const countSpan = document.getElementById('selected-count');
        const step2Next = document.getElementById('step-2-next');

        try {
            const res = await secureFetch(`${API_URL}/programmes`);
            const programmes = await res.json();
            grid.innerHTML = programmes.map(p => `
                <div class="selection-item" data-id="${p.id}">
                    <span class="type-tag">${p.type}</span>
                    <h4>${p.name}</h4>
                    <p style="font-size: 0.8rem; color: var(--secondary);">${p.description}</p>
                </div>
            `).join('');

            grid.querySelectorAll('.selection-item').forEach(item => {
                item.onclick = () => {
                    const id = item.dataset.id;
                    if (selectedProgs.includes(id)) {
                        selectedProgs = selectedProgs.filter(i => i !== id);
                        item.classList.remove('selected');
                    } else if (selectedProgs.length < 3) {
                        selectedProgs.push(id);
                        item.classList.add('selected');
                    } else {
                        alert("Please select exactly 3 programmes for evaluation.");
                    }
                    countSpan.textContent = selectedProgs.length;
                    step2Next.disabled = selectedProgs.length !== 3;
                };
            });
        } catch (e) { 
            console.error(e); 
        }

        const regSelect = document.getElementById('applicant-region');
        const distSelect = document.getElementById('applicant-district');
        let locData = {};
        try {
            const res = await secureFetch(`${API_URL}/locations`);
            locData = await res.json();
            Object.keys(locData).forEach(r => {
                const opt = document.createElement('option'); opt.value = r; opt.textContent = r;
                regSelect.appendChild(opt);
            });
        } catch (e) { 
            console.error(e); 
        }

        regSelect.onchange = () => {
            distSelect.innerHTML = '<option value="" disabled selected>Select District</option>';
            if (locData[regSelect.value]) {
                locData[regSelect.value].forEach(d => {
                    const opt = document.createElement('option'); opt.value = d; opt.textContent = d;
                    distSelect.appendChild(opt);
                });
                distSelect.disabled = false;
            }
        };

        const coreSubjs = ["English Language", "Core Mathematics", "Integrated Science", "Social Studies"];
        const gradesList = ["A1", "B2", "B3", "C4", "C5", "C6", "D7", "E8", "F9"];
        const electiveSubjs = ["Elective Mathematics", "Physics", "Chemistry", "Biology", "Economics", "Geography", "Government", "History", "Literature in English", "Business Management", "Financial Accounting", "Costing", "ICT", "Visual Arts"];

        document.getElementById('core-grades').innerHTML = coreSubjs.map(s => `
            <div style="display: flex; justify-content: space-between; align-items: center; background: #f8fafc; padding: 0.75rem 1rem; border-radius: 12px;">
                <span style="font-weight: 600; font-size: 0.9rem;">${s}</span>
                <select class="core-grade-select" required style="width: auto; padding: 0.4rem;">
                    <option value="" disabled selected>-</option>
                    ${gradesList.map(g => `<option value="${g}">${g}</option>`).join('')}
                </select>
            </div>
        `).join('');

        document.getElementById('elective-grades').innerHTML = [1, 2, 3].map(i => `
            <div style="background: #f8fafc; padding: 1rem; border-radius: 12px; display: flex; flex-direction: column; gap: 0.5rem;">
                <select class="elec-sub-select" required style="font-size: 0.85rem;">
                    <option value="" disabled selected>Select Subject ${i}</option>
                    ${electiveSubjs.map(s => `<option value="${s}">${s}</option>`).join('')}
                </select>
                <select class="elec-grade-select" required style="font-size: 0.85rem;">
                    <option value="" disabled selected>Grade</option>
                    ${gradesList.map(g => `<option value="${g}">${g}</option>`).join('')}
                </select>
            </div>
        `).join('');

        form.onsubmit = async (e) => {
            e.preventDefault();
            
            const selectedInterests = Array.from(document.querySelectorAll('input[name="careerInterest"]:checked')).map(cb => cb.value);
            if (selectedInterests.length === 0) return alert("Please select at least one career interest.");
            
            const region = regSelect.value;
            const district = distSelect.value;
            const highSchool = document.getElementById('high-school').value;
            const dob = getDobValue();
            const age = calculateAge(dob);
            const gender = document.getElementById('applicant-gender').value;
            const phone = document.getElementById('applicant-phone').value.trim();
            const numericPhone = phone.replace(/\D/g, '');
            
            if (!region || !district || !highSchool || !dob || !gender || !phone) return alert("Please fill in all required fields.");
            if (!/^\d{10}$/.test(numericPhone)) return alert("Phone number must be exactly 10 digits.");
            if (age < 0) return alert("Please enter a valid date of birth.");
            if (age < 15) return alert("You must be at least 15 years old.");

            const submitBtn = document.getElementById('submit-btn');
            submitBtn.disabled = true;
            submitBtn.textContent = "Processing Decision...";

            const payload = {
                name: authName,
                email: authEmail,
                phone: phone,
                age: age,
                dateOfBirth: dob,
                gender: gender,
                region: region,
                district: district,
                highSchool: highSchool,
                careerInterests: selectedInterests,
                selectedProgrammes: selectedProgs,
                coreGrades: Array.from(document.querySelectorAll('.core-grade-select')).map(s => s.value),
                coreSubjects: coreSubjs,
                electiveGrades: Array.from(document.querySelectorAll('.elec-grade-select')).map(s => s.value),
                electiveSubjects: Array.from(document.querySelectorAll('.elec-sub-select')).map(s => s.value)
            };

            try {
                const res = await secureFetch(`${API_URL}/recommend`, { method: 'POST', body: payload });
                const data = await res.json();
                displayResults(data);
            } catch (err) { 
                alert("Error connecting to server."); 
            } finally { 
                submitBtn.disabled = false; 
                submitBtn.textContent = "Get Recommendations"; 
            }
        };

        function displayResults(data, shouldSave = true) {
            if (shouldSave) {
                localStorage.setItem('futureme_results', JSON.stringify(data));
            }
            
            document.getElementById('form-section').classList.add('hidden');
            document.getElementById('results-section').classList.remove('hidden');
            document.getElementById('aggregate-value').textContent = data.aggregate;
            document.getElementById('recommendation-message').textContent = data.message;
            
            
            const feedbackBox = document.getElementById('personalized-feedback');
            feedbackBox.textContent = data.personalized_feedback || "";

            const container = document.getElementById('ranked-results-container');
            container.innerHTML = '';
            
            const colors = { 
                "Fully Qualified": "status-fully-qualified", 
                "Partially Qualified": "status-partial", 
                "Not Qualified": "status-unqualified" 
            };

            Object.entries(data.results).forEach(([status, progs]) => {
                progs.forEach(p => {
                    const card = document.createElement('div');
                    card.className = 'selection-item fade-in';
                    card.style.cursor = 'default';
                    card.innerHTML = `
                        <span class="type-tag">${p.type}</span>
                        <div class="status-badge ${colors[status]}">${status}</div>
                        <h4 style="margin-top: 1rem;">${p.name}</h4>
                        <p style="font-size: 0.9rem; color: var(--secondary); margin-top: 0.5rem;">${p.explanation}</p>
                    `;
                    container.appendChild(card);
                });
            });

            
            const fallbackSection = document.getElementById('fallback-suggestions');
            if (data.fallback_suggestions?.length > 0) {
                fallbackSection.classList.remove('hidden');
                document.getElementById('fallback-list').innerHTML = data.fallback_suggestions.map(s => `
                    <div class="card" style="padding: 1.5rem; box-shadow: var(--shadow-soft); border-left: 4px solid var(--accent);">
                        <h4 style="color: var(--accent); margin-bottom: 0.5rem;">${s.title}</h4>
                        <p style="font-size: 0.9rem; color: var(--secondary);">${s.text}</p>
                    </div>
                `).join('');
            } else fallbackSection.classList.add('hidden');

            
            const remSection = document.getElementById('remedial-section');
            const subjectsList = document.getElementById('subjects-to-improve-list');
            const remedialList = document.getElementById('remedial-list');

            if (data.subjects_to_improve?.length > 0 || data.remedial_suggestions?.length > 0) {
                remSection.classList.remove('hidden');
                document.getElementById('remedial-region').textContent = regSelect.value;
                
                
                if (data.subjects_to_improve?.length > 0) {
                    subjectsList.innerHTML = data.subjects_to_improve.map(s => `
                        <span style="background: white; color: #991b1b; padding: 0.5rem 1.25rem; border-radius: 12px; font-size: 0.9rem; font-weight: 700; border: 1px solid #fecaca; box-shadow: 0 2px 4px rgba(153, 27, 27, 0.05);">${s}</span>
                    `).join('');
                } else {
                    subjectsList.innerHTML = '<p style="color: #991b1b; font-style: italic;">No specific subjects identified for improvement.</p>';
                }

                
                let remedialHtml = '';
                
                if (data.remedial_suggestions && typeof data.remedial_suggestions === 'object' && !Array.isArray(data.remedial_suggestions)) {
                    Object.entries(data.remedial_suggestions).forEach(([district, schools]) => {
                        remedialHtml += `
                            <div class="district-group fade-in" style="background: white; padding: 1.5rem; border-radius: 16px; border: 1px solid #e0f2fe; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
                                <h5 style="color: #0369a1; text-transform: uppercase; font-size: 0.75rem; letter-spacing: 1.5px; font-weight: 800; margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem;">
                                    <span style="width: 8px; height: 8px; background: #0ea5e9; border-radius: 50%;"></span>
                                    ${district}
                                </h5>
                                <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 0.75rem;">
                                    ${schools.map(s => `
                                        <div style="padding: 0.75rem 1rem; background: #f8fafc; border-radius: 10px; border: 1px solid #f1f5f9; font-weight: 600; font-size: 0.85rem; color: #1e293b;">
                                            ${s}
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        `;
                    });
                } else if (Array.isArray(data.remedial_suggestions) && data.remedial_suggestions.length > 0) {
                    remedialHtml = `
                        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 1rem;">
                            ${data.remedial_suggestions.map(s => `
                                <div style="background: white; padding: 1rem; border-radius: 12px; border: 1px solid #e0f2fe; font-weight: 600; font-size: 0.85rem; text-align: center; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05); color: #1e293b;">${s}</div>
                            `).join('')}
                        </div>
                    `;
                }
                
                remedialList.innerHTML = remedialHtml || '<p style="font-size: 0.9rem; color: #64748b; text-align: center; padding: 2rem; background: white; border-radius: 16px; border: 1px dashed #e2e8f0;">No specific schools listed for this region yet. Check nearby regional capitals.</p>';
            } else {
                remSection.classList.add('hidden');
            }

            window.scrollTo(0, 0);
        }
    }
});
