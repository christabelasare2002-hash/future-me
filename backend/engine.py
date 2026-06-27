"""
FutureMe UPSA - Recommendation Engine
Handles aggregate calculations and qualification logic based on UPSA 
admission requirements.
"""

import os
from models import Programme, RemedialSchool, Region, CareerTag

def load_data():
    """Fetches programme and remedial school data from the database."""
    programmes = Programme.query.all()
    remedial_schools = {}
    
    
    regions = Region.query.all()
    for reg in regions:
        remedial_schools[reg.name] = {}
        for school in reg.remedial_schools:
            dist_name = school.district.name if school.district else "Regional / Other"
            if dist_name not in remedial_schools[reg.name]:
                remedial_schools[reg.name][dist_name] = []
            remedial_schools[reg.name][dist_name].append(school.name)
        
    
    prog_list = []
    for p in programmes:
        prog_list.append({
            "id": p.id,
            "name": p.name,
            "type": p.type,
            "max_aggregate": p.max_aggregate,
            "career_tags": [t.name for t in p.tags],
            "description": p.description,
            "prerequisites": [] 
        })
        
    return {"programmes": prog_list, "remedial_schools": remedial_schools}

def calculate_aggregate(core_grades, core_subjects, elective_grades, elective_subjects):
    """
    Calculates the WASSCE aggregate based on:
    - Best 3 Core subjects (must include English and Maths)
    - Best 3 Elective subjects
    Lower aggregate is better (A1=1, F9=9).
    """
    grade_points = {"A1": 1, "B2": 2, "B3": 3, "C4": 4, "C5": 5, "C6": 6, "D7": 7, "E8": 8, "F9": 9}
    
    core_mapped = {sub: grade_points.get(grade, 9) for sub, grade in zip(core_subjects, core_grades)}
    
    eng_pts = core_mapped.get("English Language", 9)
    math_pts = core_mapped.get("Core Mathematics", 9)
    
    other_cores = [pts for sub, pts in core_mapped.items() if sub not in ["English Language", "Core Mathematics"]]
    other_cores.sort()
    best_other_core = other_cores[0] if other_cores else 9
    
    core_total = eng_pts + math_pts + best_other_core
    
    elec_pts = [grade_points.get(g, 9) for g in elective_grades]
    elec_pts.sort()
    elec_total = sum(elec_pts[:3])
    
    return core_total + elec_total

def get_recommendations(user_data):
    """
    Analyzes user profile and grades to determine qualification status
    based on the DECISION ENGINE (RULE-BASED LOGIC).
    """
    db = load_data()
    programmes = db.get("programmes", [])
    remedial_schools = db.get("remedial_schools", {})
    
    age = user_data.get('age', 18)
    selected_pids = user_data.get('selectedProgrammes', [])
    core_grades = user_data.get('coreGrades', [])
    core_subjects = user_data.get('coreSubjects', [])
    elective_grades = user_data.get('electiveGrades', [])
    elective_subjects = user_data.get('electiveSubjects', [])
    selected_interests = user_data.get('careerInterests', [])
    user_region = user_data.get('region', 'Greater Accra')
    
    aggregate = calculate_aggregate(core_grades, core_subjects, elective_grades, elective_subjects)
    
    
    
    subjects_to_improve = []
    
    
    is_aiming_for_degree = any(p['type'] == 'Degree' for p in programmes if p['id'] in selected_pids)
    
    for s, g in zip(core_subjects + elective_subjects, core_grades + elective_grades):
        
        if g in ['E8', 'F9']:
            subjects_to_improve.append(s)
        
        elif g == 'D7' and s in core_subjects and is_aiming_for_degree:
            subjects_to_improve.append(s)
        
        elif g == 'D7' and s in elective_subjects and is_aiming_for_degree:
             subjects_to_improve.append(s)
    
    has_e8_f9 = any(g in ['E8', 'F9'] for g in core_grades + elective_grades)
    has_remedial_need = len(subjects_to_improve) > 0
    
    results = {
        "Fully Qualified": [],
        "Partially Qualified": [],
        "Not Qualified": []
    }
    
    is_fully_qualified_for_any = False
    
    for p in programmes:
        if p['id'] not in selected_pids:
            continue
            
        status = "Not Qualified"
        explanation = ""
        
        missing_pre = [pre for pre in p.get('prerequisites', []) if pre not in core_subjects + elective_subjects]
        
        
        if aggregate <= p['max_aggregate'] and not has_e8_f9 and not any(g == 'D7' for g in core_grades) and not missing_pre:
            status = "Fully Qualified"
            explanation = "You meet the aggregate and grade requirements for this degree programme."
            is_fully_qualified_for_any = True
        
        
        elif aggregate <= 30 and not has_e8_f9:
            status = "Partially Qualified"
            explanation = f"You are qualified for a Diploma pathway in this field (Aggregate {aggregate})."
        
        else:
            reasons = []
            if aggregate > p['max_aggregate']: reasons.append(f"Aggregate {aggregate} exceeds limit of {p['max_aggregate']}")
            if has_e8_f9: reasons.append(f"Failing grade(s) in {', '.join(subjects_to_improve)}")
            if any(g == 'D7' for g in core_grades): reasons.append("Core subjects must be C6 or better for degree entry")
            if missing_pre: reasons.append(f"Missing prerequisite: {', '.join(missing_pre)}")
            explanation = f"Requirements not met: {'; '.join(reasons)}."

        match_count = len(set(p.get('career_tags', [])) & set(selected_interests))
        if match_count > 0:
            explanation += f" This aligns with your interest in {', '.join(list(set(p.get('career_tags', [])) & set(selected_interests)))}."

        results[status].append({
            "id": p['id'],
            "name": p['name'],
            "type": p['type'],
            "explanation": explanation,
            "match_score": match_count
        })

    
    remedial_list = remedial_schools.get(user_region, [])
    regional_advice = ""
    
    if has_remedial_need:
        if not remedial_list:
            regional_advice = f"In {user_region}, direct remedial options are limited. We recommend checking nearby regional capitals or major hubs like Accra or Kumasi."
        else:
            regional_advice = f"We have identified several accredited remedial schools in the {user_region} region, organized by district for your convenience."

    
    fallbacks = []
    if has_remedial_need:
        fallbacks.append({
            "title": "Grade Improvement Required",
            "text": f"To qualify for your chosen UPSA programmes, you should consider improving your grades in: {', '.join(subjects_to_improve)}. {regional_advice}"
        })
    
    if age >= 25 and not is_fully_qualified_for_any:
        fallbacks.append({
            "title": "Mature Students Entry",
            "text": "As you are 25 or older, you can sit for the UPSA Mature Entrance Examinations in English, Mathematics, and Aptitude Test. This bypasses the WASSCE aggregate limit."
        })
    
    if not is_fully_qualified_for_any and not has_e8_f9:
        fallbacks.append({
            "title": "Diploma Admission",
            "text": "Your results make you eligible for UPSA's 2-year Diploma programmes. Successful completion allows direct entry into level 200/300 of a Degree programme."
        })

    
    feedback = "Based on your results, "
    if is_fully_qualified_for_any:
        feedback += "you are a strong candidate for UPSA degree programmes. Maintain your interest in your selected fields!"
    elif not has_remedial_need:
        feedback += "you are eligible for Diploma pathways. This is a great way to bridge into your desired degree."
    else:
        feedback += "your priority should be grade improvement through accredited remedial studies to unlock UPSA degree admission."
     
    return {
        "aggregate": aggregate,
        "results": results,
        "fallback_suggestions": fallbacks,
        "subjects_to_improve": subjects_to_improve,
        "remedial_suggestions": remedial_list,
        "personalized_feedback": feedback,
        "message": "Decision Engine analysis complete."
    }
