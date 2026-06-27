import json
import os
import urllib.parse
from flask import Flask
from models import db, CareerTag, Programme, Region, District, RemedialSchool, RegistrationToken, Assessment, AssessmentResult, AssessmentGrade
from dotenv import load_dotenv

load_dotenv()

def create_app():
    app = Flask(__name__)
    
    db_user = os.getenv('DB_USER', 'root')
    db_pass = urllib.parse.quote_plus(os.getenv('DB_PASSWORD', ''))
    db_host = os.getenv('DB_HOST', 'localhost')
    db_name = os.getenv('DB_NAME', 'futureme_db')
    
    
    app.config['SQLALCHEMY_DATABASE_URI'] = f"mysql+pymysql://{db_user}:{db_pass}@{db_host}/{db_name}"
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    
    if 'aivencloud.com' in db_host or os.getenv('DB_SSL', 'false').lower() == 'true':
        app.config['SQLALCHEMY_ENGINE_OPTIONS'] = {
            "connect_args": {
                "ssl": {"ssl_mode": "REQUIRED"}
            }
        }
    
    db.init_app(app)
    return app

def migrate():
    app = create_app()
    with app.app_context():
        print("🚀 Starting Migration...")
        
        
        try:
            db.drop_all()
            db.create_all()
            print("✅ Tables dropped and recreated.")
        except Exception as e:
            print(f"❌ Error creating tables: {e}")
            print("Tip: Make sure you have created the database 'futureme_db' in MySQL first.")
            return

        
        json_path = os.path.join(os.path.dirname(__file__), 'data', 'database.json')
        if not os.path.exists(json_path):
            print(f"❌ JSON file not found at {json_path}")
            return

        with open(json_path, 'r') as f:
            data = json.load(f)

        
        print("📦 Migrating Career Tags...")
        tag_map = {} 
        for p in data.get('programmes', []):
            for tag_name in p.get('career_tags', []):
                if tag_name not in tag_map:
                    tag = CareerTag.query.filter_by(name=tag_name).first()
                    if not tag:
                        tag = CareerTag(name=tag_name)
                        db.session.add(tag)
                        db.session.flush()
                    tag_map[tag_name] = tag
        
        
        print("🎓 Migrating Programmes...")
        for p_data in data.get('programmes', []):
            prog = db.session.get(Programme, p_data['id'])
            if not prog:
                prog = Programme(
                    id=p_data['id'],
                    name=p_data['name'],
                    type=p_data['type'],
                    max_aggregate=p_data['max_aggregate'],
                    description=p_data.get('description', '')
                )
                
                for tag_name in p_data.get('career_tags', []):
                    prog.tags.append(tag_map[tag_name])
                db.session.add(prog)

        
        print("📍 Migrating Locations...")
        for region_name, districts in data.get('locations', {}).items():
            region = Region.query.filter_by(name=region_name).first()
            if not region:
                region = Region(name=region_name)
                db.session.add(region)
                db.session.flush()
            
            for dist_name in districts:
                dist = District.query.filter_by(name=dist_name, region_id=region.id).first()
                if not dist:
                    db.session.add(District(name=dist_name, region_id=region.id))

        
        print("🏫 Migrating Remedial Schools...")
        for region_name, schools_data in data.get('remedial_schools', {}).items():
            region = Region.query.filter_by(name=region_name).first()
            if not region: continue
            
            if isinstance(schools_data, dict):
                
                for dist_name, schools in schools_data.items():
                    district = District.query.filter_by(name=dist_name, region_id=region.id).first()
                    for school_name in schools:
                        school = RemedialSchool.query.filter_by(name=school_name, region_id=region.id).first()
                        if not school:
                            db.session.add(RemedialSchool(
                                name=school_name, 
                                region_id=region.id, 
                                district_id=district.id if district else None
                            ))
            else:
                
                for school_name in schools_data:
                    school = RemedialSchool.query.filter_by(name=school_name, region_id=region.id).first()
                    if not school:
                        db.session.add(RemedialSchool(name=school_name, region_id=region.id))

        
        print("🔑 Migrating Tokens...")
        for token_code, t_data in data.get('registration_tokens', {}).items():
            token = db.session.get(RegistrationToken, token_code)
            if not token:
                token = RegistrationToken(
                    token=token_code,
                    email=t_data['email'],
                    name=t_data['name'],
                    usage_count=t_data['usage_count'],
                    created_at=datetime.fromisoformat(t_data['created_at']) if 'created_at' in t_data else datetime.utcnow()
                )
                db.session.add(token)

        
        print("📊 Migrating Assessments...")
        for u_data in data.get('users', []):
            profile = u_data.get('profile', {})
            
            assessment = Assessment(
                token=u_data['token'],
                timestamp=datetime.fromisoformat(u_data['timestamp']),
                applicant_name=profile.get('name'),
                applicant_email=profile.get('email'),
                phone=profile.get('phone'),
                age=profile.get('age'),
                gender=profile.get('gender'),
                region=profile.get('region'),
                district=profile.get('district'),
                high_school=profile.get('highSchool'),
                aggregate=profile.get('aggregate', 0),
                is_qualified=profile.get('is_qualified', False)
            )
            db.session.add(assessment)
            db.session.flush()

            
            core_subs = profile.get('coreSubjects', [])
            core_grades = profile.get('coreGrades', [])
            for i, sub in enumerate(core_subs):
                if i < len(core_grades):
                    db.session.add(AssessmentGrade(
                        assessment_id=assessment.id,
                        subject=sub,
                        grade=core_grades[i],
                        is_core=True
                    ))
            
            elec_subs = profile.get('electiveSubjects', [])
            elec_grades = profile.get('electiveGrades', [])
            for i, sub in enumerate(elec_subs):
                if i < len(elec_grades):
                    db.session.add(AssessmentGrade(
                        assessment_id=assessment.id,
                        subject=sub,
                        grade=elec_grades[i],
                        is_core=False
                    ))

            
            results = profile.get('results', {})
            for status, progs in results.items():
                for p in progs:
                    db.session.add(AssessmentResult(
                        assessment_id=assessment.id,
                        programme_id=p['id'],
                        status=status,
                        explanation=p['explanation'],
                        match_score=p.get('match_score', 0)
                    ))

        db.session.commit()
        print("🎉 Migration Completed Successfully!")

if __name__ == '__main__':
    from datetime import datetime
    migrate()
