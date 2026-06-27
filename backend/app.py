import os
import secrets
import datetime
import string
import random
import smtplib
import io
import csv
import threading
import urllib.parse
from functools import wraps
from flask import Flask, request, jsonify, send_file, session
from flask_cors import CORS
from dotenv import load_dotenv
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from engine import get_recommendations
from models import db, RegistrationToken, Assessment, AssessmentResult, AssessmentGrade, Programme, Region, District


load_dotenv()

app = Flask(__name__)

app.secret_key = os.getenv("FLASK_SECRET_KEY", "UPSA_FUTUREME_STABLE_KEY_2026")

app.config['SESSION_COOKIE_NAME'] = 'futureme_session'
app.config['SESSION_PERMANENT'] = True
app.config['PERMANENT_SESSION_LIFETIME'] = datetime.timedelta(days=7)

if os.getenv('RENDER') or os.getenv('FLASK_ENV') == 'production':
    app.config['SESSION_COOKIE_SAMESITE'] = 'None'
    app.config['SESSION_COOKIE_SECURE'] = True
else:
    app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'


db_user = os.getenv('DB_USER', 'root')
db_pass = urllib.parse.quote_plus(os.getenv('DB_PASSWORD', ''))
db_host = os.getenv('DB_HOST', 'localhost')
db_name = os.getenv('DB_NAME', 'futureme_db')
app.config['SQLALCHEMY_DATABASE_URI'] = f"mysql+pymysql://{db_user}:{db_pass}@{db_host}/{db_name}"
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db.init_app(app)

CORS(app, supports_credentials=True)




SMTP_SERVER = os.getenv("SMTP_SERVER", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", 587))
SMTP_USERNAME = os.getenv("SMTP_USERNAME")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")

def send_real_email(to_email, token, name):
    if not SMTP_USERNAME or not SMTP_PASSWORD or SMTP_PASSWORD == "your-app-password":
        print("⚠️ SMTP credentials not configured. Skipping real email dispatch.")
        return False
        
    try:
        msg = MIMEMultipart()
        msg['From'] = f"FutureMe UPSA <{SMTP_USERNAME}>"
        msg['To'] = to_email
        msg['Subject'] = "Your FutureMe Assessment Token"
        
        body = f"""
        Hello {name},
        
        Thank you for starting your FutureMe assessment. 
        Your unique access token is: {token}
        
        Rules:
        - Each token can be used for up to 3 assessments.
        
        Start your assessment here: http://localhost:8080
        
        Good luck!
        The FutureMe Team
        """
        msg.attach(MIMEText(body, 'plain'))
        
        print(f"📡 Attempting to send email to {to_email} via {SMTP_SERVER}:{SMTP_PORT}...")
        server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT, timeout=10)
        server.starttls()
        server.login(SMTP_USERNAME, SMTP_PASSWORD)
        server.send_message(msg)
        server.quit()
        print(f"✅ Email successfully sent to {to_email}")
        return True
    except smtplib.SMTPAuthenticationError:
        print(f"❌ SMTP Authentication Failed: Please check your username and app password.")
        return False
    except smtplib.SMTPConnectError:
        print(f"❌ SMTP Connection Failed: Could not connect to {SMTP_SERVER}:{SMTP_PORT}.")
        return False
    except Exception as e:
        print(f"❌ Failed to send real email: {type(e).__name__}: {e}")
        return False

def generate_assessment_token():
    random_str = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
    return f"UPSA-{random_str}"





@app.route('/api/tokens/generate', methods=['POST'])
def handle_token_generation():
    data = request.json
    email = data.get('email')
    name = data.get('name')
    if not email or not name:
        return jsonify({"error": "Email and Name are required"}), 400
    
    token_code = generate_assessment_token()
    
    try:
        new_token = RegistrationToken(
            token=token_code,
            email=email,
            name=name,
            usage_count=0
        )
        db.session.add(new_token)
        db.session.commit()
        
        email_sent = send_real_email(email, token_code, name)
        return jsonify({
            "message": "Token generated", 
            "token": token_code,
            "email_sent": email_sent
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Failed to save token: {str(e)}"}), 500

@app.route('/api/tokens/verify', methods=['POST'])
def handle_token_verification():
    data = request.json
    token_code = data.get('token')
    if not token_code: 
        return jsonify({"error": "Token is required"}), 400
    
    token_info = db.session.get(RegistrationToken, token_code)
    
    if not token_info: 
        return jsonify({"error": "Invalid token"}), 404
    
    if token_info.usage_count >= 3:
        return jsonify({"error": "Token has reached maximum usage limit (3)."}), 403
    
    session.permanent = True 
    session['authenticated_token'] = token_code
    session['user_email'] = token_info.email
    session['user_name'] = token_info.name
    return jsonify({"status": "verified", "name": token_info.name, "email": token_info.email})

@app.route('/api/auth/logout', methods=['POST'])
def logout():
    session.clear()
    return jsonify({"message": "Logged out"})

@app.route('/api/auth/check', methods=['GET'])
def check_auth():
    if 'authenticated_token' in session:
        return jsonify({
            "authenticated": True, 
            "name": session.get('user_name'), 
            "email": session.get('user_email')
        })
    return jsonify({"authenticated": False}), 401

@app.route('/api/locations', methods=['GET'])
def get_locations():
    regions = Region.query.all()
    loc_data = {}
    for r in regions:
        loc_data[r.name] = [d.name for d in r.districts]
    return jsonify(loc_data)

@app.route('/api/programmes', methods=['GET'])
def get_programmes():
    programmes = Programme.query.all()
    prog_list = []
    for p in programmes:
        prog_list.append({
            "id": p.id,
            "name": p.name,
            "type": p.type,
            "max_aggregate": p.max_aggregate,
            "description": p.description,
            "career_tags": [t.name for t in p.tags]
        })
    return jsonify(prog_list)

@app.route('/api/recommend', methods=['POST'])
def recommend():
    if 'authenticated_token' not in session: 
        return jsonify({"error": "Unauthorized"}), 401
    
    data = request.json
    result = get_recommendations(data)
    if "error" in result: 
        return jsonify(result), 400
    
    token_code = session['authenticated_token']
    token_info = db.session.get(RegistrationToken, token_code)
    
    if token_info:
        try:
            token_info.usage_count += 1
            
            is_qualified = False
            if "Fully Qualified" in result['results'] and len(result['results']["Fully Qualified"]) > 0:
                is_qualified = True
            
            
            assessment = Assessment(
                token=token_code,
                applicant_name=data.get('name'),
                applicant_email=data.get('email'),
                phone=data.get('phone'),
                age=data.get('age'),
                gender=data.get('gender'),
                region=data.get('region'),
                district=data.get('district'),
                high_school=data.get('highSchool'),
                aggregate=result['aggregate'],
                is_qualified=is_qualified
            )
            db.session.add(assessment)
            db.session.flush() 

            
            core_grades = data.get('coreGrades') or []
            core_subjects = data.get('coreSubjects') or []
            for i, sub in enumerate(core_subjects):
                if i < len(core_grades):
                    db.session.add(AssessmentGrade(
                        assessment_id=assessment.id,
                        subject=sub,
                        grade=core_grades[i],
                        is_core=True
                    ))
            
            elec_grades = data.get('electiveGrades') or []
            elec_subjects = data.get('electiveSubjects') or []
            for i, sub in enumerate(elec_subjects):
                if i < len(elec_grades):
                    db.session.add(AssessmentGrade(
                        assessment_id=assessment.id,
                        subject=sub,
                        grade=elec_grades[i],
                        is_core=False
                    ))

            
            for status, progs in result['results'].items():
                for p in progs:
                    db.session.add(AssessmentResult(
                        assessment_id=assessment.id,
                        programme_id=p['id'],
                        status=status,
                        explanation=p['explanation'],
                        match_score=p.get('match_score', 0)
                    ))
            
            db.session.commit()
        except Exception as e:
            db.session.rollback()
            print(f"❌ Failed to save assessment record: {e}")
        
    return jsonify({**result, "token": token_code})

@app.route('/api/simulate', methods=['POST'])
def simulate():
    data = request.json
    result = get_recommendations(data)
    if "error" in result: 
        return jsonify(result), 400
    return jsonify(result)

@app.route('/api/admin/analytics', methods=['GET'])
def get_analytics():
    assessments = Assessment.query.all()
    
    analytics = {
        "total_users": Assessment.query.count(),
        "gender_split": {"Male": 0, "Female": 0, "Other": 0},
        "age_distribution": {"15-18": 0, "19-24": 0, "25+": 0},
        "regional_distribution": {},
        "status_split": {"Qualified": 0, "Not Qualified": 0},
        "programme_selections": {},
        "failed_subjects": {},
        "suggestion_counts": {"Diploma": 0, "Remedial": 0, "Mature": 0}
    }
    
    for a in assessments:
        g = a.gender or 'Other'
        analytics['gender_split'][g] = analytics['gender_split'].get(g, 0) + 1
        
        age = a.age or 18
        if age <= 18: analytics['age_distribution']["15-18"] += 1
        elif age <= 24: analytics['age_distribution']["19-24"] += 1
        else: analytics['age_distribution']["25+"] += 1
        
        reg = a.region or 'Unknown'
        analytics['regional_distribution'][reg] = analytics['regional_distribution'].get(reg, 0) + 1
        
        if a.is_qualified: analytics['status_split']["Qualified"] += 1
        else: analytics['status_split']["Not Qualified"] += 1
        
        for res in a.results:
            pid = res.programme_id
            analytics['programme_selections'][pid] = analytics['programme_selections'].get(pid, 0) + 1
            
        for grade in a.grades:
            if grade.grade in ['E8', 'F9']: 
                analytics['failed_subjects'][grade.subject] = analytics['failed_subjects'].get(grade.subject, 0) + 1
    
    
    
    analytics['suggestion_counts']['Diploma'] = AssessmentResult.query.filter_by(status='Partially Qualified').count()
    analytics['suggestion_counts']['Remedial'] = AssessmentGrade.query.filter(AssessmentGrade.grade.in_(['E8', 'F9'])).distinct(AssessmentGrade.assessment_id).count()
    
    return jsonify(analytics)

@app.route('/api/admin/users', methods=['GET'])
def get_users():
    assessments = Assessment.query.order_by(Assessment.timestamp.desc()).all()
    user_list = []
    for a in assessments:
        user_list.append({
            "token": a.token,
            "timestamp": a.timestamp.isoformat(),
            "profile": {
                "name": a.applicant_name,
                "email": a.applicant_email,
                "phone": a.phone,
                "age": a.age,
                "gender": a.gender,
                "region": a.region,
                "district": a.district,
                "highSchool": a.high_school,
                "is_qualified": a.is_qualified,
                "aggregate": a.aggregate
            }
        })
    return jsonify(user_list)

@app.route('/api/admin/export/csv', methods=['GET'])
def export_csv():
    assessments = Assessment.query.order_by(Assessment.timestamp.desc()).all()
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(['Date', 'Applicant Name', 'Email', 'Phone', 'Age', 'Gender', 'Region', 'District', 'High School', 'Grades', 'Qualified'])
    
    for a in assessments:
        grades_str = ", ".join([f"{g.subject}:{g.grade}" for g in a.grades])
        
        writer.writerow([
            a.timestamp.strftime('%Y-%m-%d %H:%M'), 
            a.applicant_name or 'N/A', 
            a.applicant_email or 'N/A',
            a.phone or 'N/A',
            a.age or 'N/A',
            a.gender or 'N/A',
            a.region or 'N/A', 
            a.district or 'N/A',
            a.high_school or 'N/A',
            grades_str, 
            "Yes" if a.is_qualified else "No"
        ])
    
    output.seek(0)
    return send_file(
        io.BytesIO(output.getvalue().encode('utf-8')), 
        mimetype='text/csv', 
        as_attachment=True, 
        download_name=f'UPSA_Assessment_Report_{datetime.datetime.now().strftime("%Y%m%d")}.csv'
    )

if __name__ == '__main__':
    app.run(debug=True, port=5000)