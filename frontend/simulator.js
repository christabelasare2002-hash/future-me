document.addEventListener('DOMContentLoaded', async () => {
    const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? 'http://127.0.0.1:5000/api'
        : 'https://futureme-backend-pdv6.onrender.com/api'; // TODO: Replace with your actual hosted backend API URL

    const grades = ["A1", "B2", "B3", "C4", "C5", "C6", "D7", "E8", "F9"];
    const coreSubjects = ["English Language", "Core Mathematics", "Integrated Science", "Social Studies"];
    const electiveSubjects = [
        "Elective Mathematics", "Physics", "Chemistry", "Biology", "Agricultural Science", 
        "Technical Drawing", "Electronics", "Computer Science / ICT", "Geology", "History", 
        "Geography", "Economics", "Government", "Literature in English", "French", "Spanish", 
        "German", "Twi", "Ga", "Ewe", "Dagbani", "Christian Religious Studies (CRS)", "Music", 
        "Visual Arts", "Accounting", "Business Management", "Costing & Budgeting", "Office Practice", 
        "Home Economics", "Physical Education"
    ];

    const programmeSelect = document.getElementById('sim-programme');
    const coreContainer = document.getElementById('sim-core-grades');
    const electiveContainer = document.getElementById('sim-elective-grades');
    const form = document.getElementById('simulator-form');

    
    try {
        const res = await fetch(`${API_URL}/programmes`);
        const programmes = await res.json();
        programmes.forEach(p => {
            const opt = document.createElement('option');
            opt.value = p.id;
            opt.textContent = `[${p.type}] ${p.name}`;
            programmeSelect.appendChild(opt);
        });
    } catch (e) { console.error(e); }

    
    coreContainer.innerHTML = coreSubjects.map(s => `
        <div style="display: flex; flex-direction: column;">
            <span style="font-size: 0.7rem; font-weight: 700; color: var(--secondary); margin-bottom: 0.2rem;">${s}</span>
            <select class="sim-core-grade" required>
                ${grades.map(g => `<option value="${g}">${g}</option>`).join('')}
            </select>
        </div>
    `).join('');

    
    electiveContainer.innerHTML = [1, 2, 3].map(i => `
        <div style="display: flex; flex-direction: column; gap: 0.2rem;">
            <select class="sim-elective-sub" required style="font-size: 0.8rem; padding: 0.5rem;">
                <option value="" disabled selected>Subject ${i}</option>
                ${electiveSubjects.map(s => `<option value="${s}">${s}</option>`).join('')}
            </select>
            <select class="sim-elective-grade" required style="font-size: 0.8rem; padding: 0.5rem;">
                <option value="" disabled selected>Grade</option>
                ${grades.map(g => `<option value="${g}">${g}</option>`).join('')}
            </select>
        </div>
    `).join('');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const payload = {
            selectedProgrammes: [programmeSelect.value],
            coreGrades: Array.from(document.querySelectorAll('.sim-core-grade')).map(s => s.value),
            coreSubjects: coreSubjects,
            electiveGrades: Array.from(document.querySelectorAll('.sim-elective-grade')).map(s => s.value),
            electiveSubjects: Array.from(document.querySelectorAll('.sim-elective-sub')).map(s => s.value),
            age: 19 
        };

        try {
            const res = await fetch(`${API_URL}/simulate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            displaySimResults(data, programmeSelect.value);
        } catch (err) {
            alert("Simulation failed. Make sure the backend is running.");
        }
    });

    function displaySimResults(data, targetPid) {
        document.getElementById('sim-placeholder').classList.add('hidden');
        document.getElementById('sim-results-content').classList.remove('hidden');
        
        document.getElementById('sim-aggregate').textContent = data.aggregate;
        
        
        let targetResult = null;
        for (const cat in data.results) {
            const found = data.results[cat].find(p => p.id === targetPid);
            if (found) {
                targetResult = { ...found, status: cat };
                break;
            }
        }

        const statusBox = document.getElementById('sim-status-box');
        const statusText = document.getElementById('sim-status-text');
        const explanation = document.getElementById('sim-explanation');

        if (targetResult) {
            statusText.textContent = targetResult.status;
            explanation.textContent = targetResult.explanation;
            
            statusBox.className = '';
            if (targetResult.status === 'Fully Qualified') statusBox.classList.add('status-fully-qualified');
            else if (targetResult.status === 'Partially Qualified') statusBox.classList.add('status-partial');
            else statusBox.classList.add('status-unqualified');
        }
    }
});
