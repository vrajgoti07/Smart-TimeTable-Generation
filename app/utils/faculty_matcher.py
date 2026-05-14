import re
from typing import List, Optional

# Rule 1: SUBJECT NORMALIZATION MAPPING
SUBJECT_MAPPING = {
    "operating systems": ["os"],
    "computer networks": ["cn"],
    "machine learning": ["ml"],
    "data structures and algorithms": ["daa", "ds"],
    "daa": ["daa"],
    "dbms": ["dbms"],
    "database management system": ["dbms"],
    "advanced java": ["java", "adv java"],
    "python programming": ["python"],
    "software engineering": ["se"],
    "artificial intelligence": ["ai"]
}

def normalize(val: str) -> str:
    """Normalize string for comparison."""
    if not val:
        return ""
    return val.strip().lower()

def get_normalized_keywords(course_name: str) -> List[str]:
    """Expand subject name into a list of keywords based on mapping."""
    name = normalize(course_name)
    keywords = [name]
    
    # Check mapping
    for key, mapped_list in SUBJECT_MAPPING.items():
        if key in name or name in key:
            keywords.extend(mapped_list)
            
    return list(set(keywords))

def get_subject_key(course_name: str) -> str:
    """Get the primary normalized key for a subject (e.g., 'Operating Systems' -> 'os')."""
    name = normalize(course_name)
    for key, mapped_list in SUBJECT_MAPPING.items():
        if key == name or name == key or name in mapped_list:
            return mapped_list[0] if mapped_list else key
    return name

def get_auto_mapped_faculty(
    course: dict, 
    faculty_list: List[dict], 
    type_needed: str, 
    exclude_ids: Optional[List[str]] = None,
    current_branch: Optional[str] = None
) -> List[dict]:
    """
    Intelligent Faculty Scorer and Selector.
    
    Rule 0: Respect manual branch-specific assignments
    Rule 1: Distribution Control (Penalty for same subject across branches)
    Rule 2: Scoring System (+50 Expertise, +30 Keywords, +20 Dept)
    """
    if exclude_ids is None:
        exclude_ids = []
        
    type_needed = type_needed.lower()
    course_name = course.get("name", "")
    target_branch = current_branch or course.get("branch") or course.get("department_id")
    
    # NEW: Check for manual pre-assignment in the new dictionary structure
    faculty_map = course.get("faculty", {})
    if isinstance(faculty_map, dict) and target_branch in faculty_map:
        branch_assignment = faculty_map[target_branch]
        assigned_names = []
        
        # Determine possible keys for the type needed
        possible_keys = [type_needed]
        if type_needed == "practical": possible_keys.append("lab")
        if type_needed == "theory": possible_keys.append("lecture")
        
        if isinstance(branch_assignment, dict):
            # Check all possible keys (case-insensitive)
            for k, v in branch_assignment.items():
                if k.lower() in possible_keys and isinstance(v, list):
                    assigned_names.extend(v)
        
        if assigned_names:
            # Match by name (trimmed and case-insensitive)
            matches = []
            for name in assigned_names:
                clean_name = name.strip().lower()
                for fn in faculty_list:
                    if fn["name"].strip().lower() == clean_name:
                        matches.append(fn)
            if matches:
                return matches
    
    c_name_norm = normalize(course_name)
    c_keywords = get_normalized_keywords(course_name)
    subj_key = get_subject_key(course_name)
    
    scored_faculty = []
    
    for f in faculty_list:
        f_id = str(f.get("_id") or f.get("id"))
        score = 0
        
        load = f.get("current_hours", 0)
        max_h = f.get("max_hours", 15)
        
        # 1. Expertise Matching
        expertise = [normalize(e) for e in (f.get("expertise") or [])]
        expertise_match = False
        
        # Exact match (+200 - Critical Priority)
        if c_name_norm in expertise:
            score += 200
            expertise_match = True
        # Normalized match (+100 - High Priority)
        elif any(kw in expertise or any(kw in exp or exp in kw for exp in expertise) for kw in c_keywords):
            score += 100
            expertise_match = True
            
        # Hard Penalty for Zero Expertise (-500)
        # This prevents DAA teachers from getting OS slots just because they are in CSE
        if not expertise_match:
            score -= 500
            
        # 2. Department match (+50 - Secondary Preference)
        if f.get("department") == target_branch:
            score += 50
            
        # 3. Load Management
        load_ratio = load / max_h if max_h > 0 else 1.0
        if load_ratio >= 1.0:
            score -= 100 # Rule 2: Reject/Penalize over max
        elif load_ratio > 0.8:
            score -= 40  # Rule 2: Near max load
            
        # 4. Distribution Control (Rule 4)
        if f_id in exclude_ids:
            score -= 1000 # Force distribution across branches
            
        scored_faculty.append({
            "faculty": f,
            "score": score,
            "load": load
        })
        
    # Sort by Score (descending), then Load (ascending) for tie-breaking
    scored_faculty.sort(key=lambda x: (-x["score"], x["load"]))
    
    if not scored_faculty:
        # Emergency fallback
        return sorted(faculty_list, key=lambda x: x.get("current_hours", 0))[:5]
        
    # Return top scorers (all with the same highest score)
    best_score = scored_faculty[0]["score"]
    return [item["faculty"] for item in scored_faculty if item["score"] == best_score]
