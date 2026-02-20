"""
Global Search Service
Searches across students, teachers, classes, subjects, fees, library, etc.
"""
from sqlalchemy.orm import Session
from sqlalchemy import or_, func
from app.models.student import Student
from app.models.teacher import Teacher
from app.models.class_model import Class
from app.models.subject import Subject


class SearchService:
    def __init__(self, db: Session):
        self.db = db

    def global_search(self, query: str, tenant_id: str, modules: list = None,
                      limit: int = 20, offset: int = 0) -> dict:
        """Search across all modules and return categorized results."""
        q = f"%{query.lower()}%"
        results = []
        facets = {}

        search_modules = modules or ["students", "teachers", "classes", "subjects"]

        if "students" in search_modules:
            students = self.db.query(Student).filter(
                Student.tenant_id == tenant_id,
                Student.is_active == True,
                or_(
                    func.lower(Student.first_name).like(q),
                    func.lower(Student.last_name).like(q),
                    func.lower(Student.admission_number).like(q),
                    func.lower(Student.email).like(q),
                )
            ).limit(limit).all()
            for s in students:
                results.append({
                    "id": s.id, "type": "student",
                    "title": f"{s.first_name} {s.last_name}",
                    "subtitle": f"Adm: {s.admission_number}",
                    "link": f"/dashboard/students/{s.id}",
                    "icon": "student",
                })
            facets["students"] = len(students)

        if "teachers" in search_modules:
            teachers = self.db.query(Teacher).filter(
                Teacher.tenant_id == tenant_id,
                Teacher.is_active == True,
                or_(
                    func.lower(Teacher.first_name).like(q),
                    func.lower(Teacher.last_name).like(q),
                    func.lower(Teacher.employee_id).like(q),
                    func.lower(Teacher.email).like(q),
                )
            ).limit(limit).all()
            for t in teachers:
                results.append({
                    "id": t.id, "type": "teacher",
                    "title": f"{t.first_name} {t.last_name}",
                    "subtitle": f"Emp: {t.employee_id}",
                    "link": f"/dashboard/teachers/{t.id}",
                    "icon": "teacher",
                })
            facets["teachers"] = len(teachers)

        if "classes" in search_modules:
            classes = self.db.query(Class).filter(
                Class.tenant_id == tenant_id,
                Class.is_active == True,
                or_(
                    func.lower(Class.name).like(q),
                    func.lower(Class.section).like(q),
                )
            ).limit(limit).all()
            for c in classes:
                results.append({
                    "id": c.id, "type": "class",
                    "title": f"{c.name} - {c.section}",
                    "subtitle": f"Capacity: {c.capacity}",
                    "link": f"/dashboard/classes",
                    "icon": "class",
                })
            facets["classes"] = len(classes)

        if "subjects" in search_modules:
            subjects = self.db.query(Subject).filter(
                Subject.tenant_id == tenant_id,
                Subject.is_active == True,
                or_(
                    func.lower(Subject.name).like(q),
                    func.lower(Subject.code).like(q),
                )
            ).limit(limit).all()
            for s in subjects:
                results.append({
                    "id": s.id, "type": "subject",
                    "title": s.name,
                    "subtitle": f"Code: {s.code}",
                    "link": f"/dashboard/subjects",
                    "icon": "subject",
                })
            facets["subjects"] = len(subjects)

        return {
            "query": query,
            "results": results[:limit],
            "total": len(results),
            "facets": facets,
        }

    def autocomplete(self, query: str, tenant_id: str, limit: int = 8) -> list:
        """Fast autocomplete — returns up to 8 suggestions."""
        q = f"%{query.lower()}%"
        suggestions = []

        # Students
        students = self.db.query(Student.first_name, Student.last_name, Student.id).filter(
            Student.tenant_id == tenant_id, Student.is_active == True,
            or_(func.lower(Student.first_name).like(q), func.lower(Student.last_name).like(q))
        ).limit(4).all()
        for s in students:
            suggestions.append({"text": f"{s.first_name} {s.last_name}", "type": "student", "id": s.id})

        # Teachers
        teachers = self.db.query(Teacher.first_name, Teacher.last_name, Teacher.id).filter(
            Teacher.tenant_id == tenant_id, Teacher.is_active == True,
            or_(func.lower(Teacher.first_name).like(q), func.lower(Teacher.last_name).like(q))
        ).limit(4).all()
        for t in teachers:
            suggestions.append({"text": f"{t.first_name} {t.last_name}", "type": "teacher", "id": t.id})

        return suggestions[:limit]
