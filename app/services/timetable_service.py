import random
import logging
from typing import List, Dict, Optional
from datetime import datetime
from bson import ObjectId

from app.database import get_database
from app.core.exceptions import SchedulingError
from app.models.timetable import TimetableEntry, GenerationConstraints
from app.utils.faculty_matcher import get_auto_mapped_faculty, get_subject_key
from app.services.notification_service import NotificationService

logger = logging.getLogger(__name__)

class TimetableService:
    def __init__(self):
        self.DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
        self.SLOTS = ["09:10", "10:10", "12:10", "13:10", "14:20", "15:20"]

    async def generate_timetable(self, department_id: Optional[str] = None, semester: Optional[int] = None, section: Optional[str] = None, branch: Optional[str] = None, constraints: Optional[GenerationConstraints] = None):
        """
        Fully automated timetable generation engine.
        Automatically maps faculty to courses and ensures balanced workload.
        """
        db = get_database()
        logger.info(f"Starting Automated Timetable Generation for {department_id} S{semester}")
        
        if not department_id or semester is None:
            raise SchedulingError("Department and Semester are required")

        dept_id = branch if branch else department_id
        sem = int(semester)
        sec = section
        
        # Add safe defaults for constraints
        if not constraints:
            constraints = GenerationConstraints()
        self.constraints = constraints
        
        # 1. Track global subject-to-faculty assignments for diversity
        # Format: {subject_name: [faculty_ids]}
        self.branch_assignments = {}
        
        MAX_ATTEMPTS = 5
        valid_entries = None
        
        for attempt in range(1, MAX_ATTEMPTS + 1):
            logger.info(f"Attempt {attempt}: Generating timetable")
            
            # 2. Initialize Conflict Tracking
            faculty_schedule = {} # (faculty_id, timeslot) -> bool
            room_schedule = {}    # (room_id, timeslot) -> bool
            room_usage = {}       # (room_id) -> count (for balancing)
            
            query = {"$or": [
                {"department_id": {"$ne": dept_id}},
                {"semester": {"$ne": sem}}
            ]}
            if sec:
                query["$or"].append({"section": {"$ne": sec}})
                
            existing_entries = await db.timetable.find(query).to_list(length=5000)
            for entry in existing_entries:
                day_val = entry.get('day_of_week') or entry.get('day', 'Unknown')
                time_val = entry.get('start_time') or entry.get('time', 'Unknown')
                ts = f"{day_val}-{time_val}"
                faculty_schedule[(entry.get('faculty_id'), ts)] = True
                room_schedule[(entry.get('room_id'), ts)] = True
                
                # Update branch assignments tracker from existing entries to avoid reuse
                if entry.get('course_name') and entry.get('faculty_id'):
                    name_key = get_subject_key(entry['course_name'])
                    if name_key not in self.branch_assignments:
                        self.branch_assignments[name_key] = []
                    if entry['faculty_id'] not in self.branch_assignments[name_key]:
                        self.branch_assignments[name_key].append(entry['faculty_id'])

            # 3. Load Data
            rooms = await db.rooms.find({}).to_list(length=100)
            faculty_list = await db.faculty.find({}).to_list(length=500)
            
            for r in rooms: room_usage[str(r["_id"])] = 0
            
            for f in faculty_list:
                f_id = str(f["_id"])
                f["current_hours"] = sum(1 for e in existing_entries if e["faculty_id"] == f_id)

            courses_query = {
                "semester": sem,
                "$or": [
                    {"branch": dept_id},
                    {"type": "COMMON", "branches": dept_id}
                ]
            }
            courses = await db.courses.find(courses_query).to_list(length=100)
            
            if not courses:
                logger.warning(f"Validation Layer: No subjects found for branch {dept_id}, semester {sem}. Skipping generation.")
                return {"status": "success", "entries_count": 0}
                
            random.shuffle(courses)
                
            all_new_entries = []
            global_slots = {} # (timeslot) -> bool
            
            # 1. Schedule all PRACTICALS first (Priority)
            for course in courses:
                logger.info(f"Processing PRACTICAL for course: {course['name']}")
                practical_hours = int(course.get("practical_credit", 0))
                remaining_p = practical_hours
                avoid_days_p = set()
                
                while remaining_p >= 2:
                    success = self._schedule_course_unit(
                        course=course, l_type="Practical", block_size=2, faculty_list=faculty_list,
                        rooms=rooms, f_sch=faculty_schedule, r_sch=room_schedule, r_usage=room_usage,
                        g_slots=global_slots, entries=all_new_entries, dept_id=dept_id, sem=sem, sec=sec, avoid_days=avoid_days_p,
                        constraints=constraints
                    )
                    if success: remaining_p -= 2
                    else: break
            
            # 2. Schedule all THEORY next
            for course in courses:
                logger.info(f"Processing THEORY for course: {course['name']}")
                theory_hours = int(course.get("theory_credit", 0))
                remaining_t = theory_hours
                avoid_days_t = set()
                
                while remaining_t > 0:
                    success = self._schedule_course_unit(
                        course=course, l_type="Theory", block_size=1, faculty_list=faculty_list,
                        rooms=rooms, f_sch=faculty_schedule, r_sch=room_schedule, r_usage=room_usage,
                        g_slots=global_slots, entries=all_new_entries, dept_id=dept_id, sem=sem, sec=sec, avoid_days=avoid_days_t,
                        constraints=constraints
                    )
                    if success: remaining_t -= 1
                    else: break

            if self._validate_timetable(all_new_entries):
                # SUCCESS: Apply assignments to tracker for future runs
                for entry in all_new_entries:
                    name_key = get_subject_key(entry.course_name)
                    if name_key not in self.branch_assignments:
                        self.branch_assignments[name_key] = []
                    if entry.faculty_id not in self.branch_assignments[name_key]:
                        self.branch_assignments[name_key].append(entry.faculty_id)
                valid_entries = all_new_entries
                break

        if not valid_entries:
            raise SchedulingError("Valid timetable not found after max attempts.")

        # PERSISTENCE: Safe Cleanup
        # We use a very strict query to ensure we ONLY delete the specific timetable 
        # that we are regenerating. This prevents the "overlap" issue.
        delete_query = {
            "semester": sem
        }
        # Be precise about branch vs department_id
        if branch and branch != "All":
            delete_query["department_id"] = branch
        elif department_id and department_id != "All":
            delete_query["department_id"] = department_id
            
        if sec and sec != "All": 
            delete_query["section"] = sec

        logger.info(f"Cleaning up old entries with query: {delete_query}")
        await db.timetable.delete_many(delete_query)

        batch = [e.model_dump() if hasattr(e, "model_dump") else e.dict() for e in valid_entries]
        await db.timetable.insert_many(batch)

        for f in faculty_list:
            await db.faculty.update_one({"_id": f["_id"]}, {"$set": {"current_hours": f.get("current_hours", 0)}})
        
        # Notify Faculty
        notified_faculty = set()
        for entry in valid_entries:
            f_key = str(entry.faculty_id)
            if f_key and f_key not in notified_faculty:
                await NotificationService.create_notification(
                    user_id=f_key,
                    title="New Schedule Assigned",
                    message=f"You have been assigned to {entry.course_name} for {dept_id} Sem {sem}.",
                    type="info"
                )
                notified_faculty.add(f_key)

        return {"status": "success", "entries_count": len(valid_entries)}

    def _schedule_course_unit(self, course, l_type, block_size, faculty_list, rooms, f_sch, r_sch, r_usage, g_slots, entries, dept_id, sem, sec, avoid_days=None, constraints=None):
        """Helper to find and assign slots for a unit (1 or 2 hours) of a course."""
        if avoid_days is None: avoid_days = set()
        if not constraints: constraints = GenerationConstraints()
        
        # Track already assigned faculty for this subject name to encourage diversity
        subj_key = get_subject_key(course.get("name", ""))
        exclude_ids = self.branch_assignments.get(subj_key, [])
        
        eligible_facs = self._get_auto_mapped_faculty(course, faculty_list, l_type.lower(), exclude_ids=exclude_ids, current_branch=dept_id)
        
        available_days = [d for d in self.DAYS if d not in avoid_days]
        random.shuffle(available_days)
        fallback_days = [d for d in self.DAYS if d in avoid_days]
        random.shuffle(fallback_days)
        
        days_to_try = available_days + (fallback_days if block_size == 1 else [])
            
        for day in days_to_try:
            if block_size == 2:
                for i in range(len(self.SLOTS) - 1):
                    s1, s2 = self.SLOTS[i], self.SLOTS[i+1]
                    if s1 == "10:10" and s2 == "12:10": continue
                    if f"{day}-{s1}" in g_slots or f"{day}-{s2}" in g_slots: continue
                    
                    for faculty in eligible_facs:
                        f_id = str(faculty["_id"])
                        if (f_id, f"{day}-{s1}") in f_sch or (f_id, f"{day}-{s2}") in f_sch: continue
                        
                        # Load check strictly respects Target Workload from UI
                        workload_limit = constraints.facultyWorkload if constraints else 18
                        if (faculty.get("current_hours", 0) + 2) > workload_limit: continue
                        if not self._is_faculty_available(faculty, day, [s1, s2]): continue
                        
                        # Max Consecutive Hours Check
                        if not self._check_consecutive_hours(f_sch, f_id, day, [s1, s2], constraints.maxConsecutiveHours):
                            continue

                        room = self._find_best_room(rooms, "Lab" if l_type == "Practical" else "Theory", f"{day}-{s1}", r_sch, r_usage, second_slot=f"{day}-{s2}", strategy=constraints.roomUtilization)
                        if room:
                            self._apply_assignment(entries, faculty, room, day, s1, course, l_type, f_sch, r_sch, r_usage, g_slots, dept_id, sem, sec)
                            self._apply_assignment(entries, faculty, room, day, s2, course, l_type, f_sch, r_sch, r_usage, g_slots, dept_id, sem, sec)
                            avoid_days.add(day)
                            return True
            else:
                slots = self.SLOTS.copy()
                random.shuffle(slots)
                for slot in slots:
                    ts = f"{day}-{slot}"
                    if ts in g_slots: continue
                    
                    for faculty in eligible_facs:
                        f_id = str(faculty["_id"])
                        if (f_id, ts) in f_sch: continue
                        
                        # Load check strictly respects Target Workload from UI
                        workload_limit = constraints.facultyWorkload if constraints else 18
                        if (faculty.get("current_hours", 0) + 1) > workload_limit: continue
                        if not self._is_faculty_available(faculty, day, [slot]): continue
                        
                        # Max Consecutive Hours Check
                        if not self._check_consecutive_hours(f_sch, f_id, day, [slot], constraints.maxConsecutiveHours):
                            continue

                        room = self._find_best_room(rooms, "Lab" if l_type == "Practical" else "Theory", ts, r_sch, r_usage, strategy=constraints.roomUtilization)
                        if room:
                            self._apply_assignment(entries, faculty, room, day, slot, course, l_type, f_sch, r_sch, r_usage, g_slots, dept_id, sem, sec)
                            avoid_days.add(day)
                            return True
        return False

    def _is_faculty_available(self, faculty, day, slots: List[str]):
        """Check if faculty has marked themselves as available for the given day and slots."""
        availability = faculty.get("availability", {})
        if not availability:
            return True
            
        day_availability = availability.get(day, [])
        if not day_availability:
            return day in availability and False or True 
            
        return all(slot in day_availability for slot in slots)

    def _check_consecutive_hours(self, f_sch, f_id, day, new_slots, max_consecutive):
        """
        Ensures that adding new_slots does not cause faculty to exceed max_consecutive hours.
        """
        slot_indices = {slot: i for i, slot in enumerate(self.SLOTS)}
        
        assigned_indices = set()
        for i, s in enumerate(self.SLOTS):
            if (f_id, f"{day}-{s}") in f_sch:
                assigned_indices.add(i)
        
        for s in new_slots:
            if s in slot_indices:
                assigned_indices.add(slot_indices[s])

        if not assigned_indices: return True

        sorted_indices = sorted(list(assigned_indices))
        max_seen = 0
        current_streak = 0
        last_idx = -1
        
        for idx in sorted_indices:
            if idx == last_idx + 1:
                current_streak += 1
            else:
                current_streak = 1
            max_seen = max(max_seen, current_streak)
            last_idx = idx

        return max_seen <= max_consecutive

    def _get_auto_mapped_faculty(self, course, faculty_list, type_needed, exclude_ids=None, current_branch=None):
        return get_auto_mapped_faculty(course, faculty_list, type_needed, exclude_ids=exclude_ids, current_branch=current_branch)

    def _find_best_room(self, rooms, target_type, timeslot, r_sch, r_usage, second_slot=None, strategy="Balanced"):
        eligible_rooms = [r for r in rooms if r.get("room_type", "").lower() == target_type.lower()]
        if not eligible_rooms: return None
        
        if strategy == "Balanced":
            # Spread utilization across all rooms
            eligible_rooms.sort(key=lambda r: r_usage.get(str(r["_id"]), 0))
        else:
            # Compact: Fill fewer rooms to save utilities/space
            eligible_rooms.sort(key=lambda r: r.get("name", ""))
        
        for room in eligible_rooms:
            r_id = str(room["_id"])
            if (r_id, timeslot) not in r_sch:
                if second_slot:
                    if (r_id, second_slot) not in r_sch:
                        return room
                else:
                    return room
        return None

    def _apply_assignment(self, entries, faculty, room, day, slot, course, l_type, f_sch, r_sch, r_usage, g_slots, dept_id, sem, sec):
        f_id = str(faculty["_id"])
        r_id = str(room["_id"])
        ts = f"{day}-{slot}"
        
        sh, sm = map(int, slot.split(':'))
        eh, em = sh + 1, sm
        end_time = f"{eh:02d}:{em:02d}"

        entry = TimetableEntry(
            course_id=str(course["_id"]),
            faculty_id=f_id,
            room_id=r_id,
            department_id=dept_id,
            semester=sem,
            section=sec,
            day_of_week=day,
            start_time=slot,
            end_time=end_time,
            course_name=course["name"],
            room_name=room["name"],
            faculty_name=faculty["name"],
            type=l_type
        )
        entries.append(entry)
        
        logger.info(f"Assigning {course['name']} -> {faculty['name']} for {day} {slot}")
        f_sch[(f_id, ts)] = True
        r_sch[(r_id, ts)] = True
        g_slots[ts] = True
        r_usage[r_id] = r_usage.get(r_id, 0) + 1
        faculty["current_hours"] = faculty.get("current_hours", 0) + 1

    def _validate_timetable(self, entries: List[TimetableEntry]) -> bool:
        """
        Global validation to ensure LABs strictly follow the 2-continuous-hour rule.
        Also enforces that a single course does not have multiple lab sessions on the same day.
        """
        lab_entries = {}
        for entry in entries:
            is_lab = False
            if hasattr(entry, "type") and entry.type:
                if entry.type.lower() == "practical" or "lab" in entry.type.lower():
                    is_lab = True
            if hasattr(entry, "course_name") and entry.course_name:
                if "lab" in entry.course_name.lower():
                    is_lab = True

            if is_lab:
                c_id = entry.course_id
                if c_id not in lab_entries:
                    lab_entries[c_id] = []
                lab_entries[c_id].append(entry)

        slot_idx = {s: i for i, s in enumerate(self.SLOTS)}
        
        for c_id, labs in lab_entries.items():
            if len(labs) % 2 != 0:
                logger.warning(f"Validation failed: Lab {c_id} does not have an even number of slots ({len(labs)}).")
                return False
                
            labs.sort(key=lambda e: (e.day_of_week, slot_idx.get(e.start_time, 99)))
            
            seen_days = set()
            
            for i in range(0, len(labs), 2):
                l1 = labs[i]
                l2 = labs[i+1]
                
                if l1.day_of_week != l2.day_of_week:
                    logger.warning(f"Validation failed: Lab slots not on same day for {c_id}.")
                    return False
                    
                if l1.day_of_week in seen_days:
                    logger.warning(f"Validation failed: Lab {c_id} is scheduled multiple times on {l1.day_of_week}.")
                    return False
                seen_days.add(l1.day_of_week)
                    
                if l1.faculty_id != l2.faculty_id:
                    logger.warning(f"Validation failed: Lab slots have different faculty for {c_id}.")
                    return False
                    
                if l1.room_id != l2.room_id:
                    logger.warning(f"Validation failed: Lab slots have different rooms for {c_id}.")
                    return False
                    
                idx1 = slot_idx.get(l1.start_time, -1)
                idx2 = slot_idx.get(l2.start_time, -1)
                
                if idx2 - idx1 != 1:
                    logger.warning(f"Validation failed: Lab slots are not consecutive for {c_id} ({l1.start_time} and {l2.start_time}).")
                    return False
                    
                if idx1 == 1 and idx2 == 2:
                    logger.warning(f"Validation failed: Lab crosses break for {c_id}.")
                    return False

        return True
