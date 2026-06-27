from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()


programme_tags = db.Table('programme_tags',
    db.Column('programme_id', db.String(50), db.ForeignKey('programmes.id'), primary_key=True),
    db.Column('tag_id', db.Integer, db.ForeignKey('career_tags.id'), primary_key=True)
)

class CareerTag(db.Model):
    __tablename__ = 'career_tags'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), unique=True, nullable=False)

class Programme(db.Model):
    __tablename__ = 'programmes'
    id = db.Column(db.String(50), primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    type = db.Column(db.String(50), nullable=False) 
    max_aggregate = db.Column(db.Integer, nullable=False)
    description = db.Column(db.Text)
    
    tags = db.relationship('CareerTag', secondary=programme_tags, backref=db.backref('programmes', lazy='dynamic'))

class Region(db.Model):
    __tablename__ = 'regions'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), unique=True, nullable=False)
    districts = db.relationship('District', backref='region', lazy=True)
    remedial_schools = db.relationship('RemedialSchool', backref='region', lazy=True)

class District(db.Model):
    __tablename__ = 'districts'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    region_id = db.Column(db.Integer, db.ForeignKey('regions.id'), nullable=False)

class RemedialSchool(db.Model):
    __tablename__ = 'remedial_schools'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    region_id = db.Column(db.Integer, db.ForeignKey('regions.id'), nullable=False)
    district_id = db.Column(db.Integer, db.ForeignKey('districts.id'), nullable=True)
    
    district = db.relationship('District', backref='remedial_schools', lazy=True)

class RegistrationToken(db.Model):
    __tablename__ = 'registration_tokens'
    token = db.Column(db.String(20), primary_key=True)
    email = db.Column(db.String(120), nullable=False)
    name = db.Column(db.String(100), nullable=False)
    usage_count = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class Assessment(db.Model):
    __tablename__ = 'assessments'
    id = db.Column(db.Integer, primary_key=True)
    token = db.Column(db.String(20), db.ForeignKey('registration_tokens.token'))
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    
    
    applicant_name = db.Column(db.String(100))
    applicant_email = db.Column(db.String(120))
    phone = db.Column(db.String(20))
    age = db.Column(db.Integer)
    gender = db.Column(db.String(20))
    region = db.Column(db.String(100))
    district = db.Column(db.String(100))
    high_school = db.Column(db.String(200))
    
    
    aggregate = db.Column(db.Integer)
    is_qualified = db.Column(db.Boolean, default=False)
    
    results = db.relationship('AssessmentResult', backref='assessment', lazy=True)
    grades = db.relationship('AssessmentGrade', backref='assessment', lazy=True)

class AssessmentResult(db.Model):
    __tablename__ = 'assessment_results'
    id = db.Column(db.Integer, primary_key=True)
    assessment_id = db.Column(db.Integer, db.ForeignKey('assessments.id'), nullable=False)
    programme_id = db.Column(db.String(50), db.ForeignKey('programmes.id'))
    status = db.Column(db.String(50)) 
    explanation = db.Column(db.Text)
    match_score = db.Column(db.Integer)

class AssessmentGrade(db.Model):
    __tablename__ = 'assessment_grades'
    id = db.Column(db.Integer, primary_key=True)
    assessment_id = db.Column(db.Integer, db.ForeignKey('assessments.id'), nullable=False)
    subject = db.Column(db.String(100), nullable=False)
    grade = db.Column(db.String(5), nullable=False)
    is_core = db.Column(db.Boolean, default=True)
