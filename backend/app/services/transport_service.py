"""
Transport Management service
"""
from datetime import date
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.transport import TransportRoute, Vehicle, TransportAssignment, VehicleStatus, RouteStatus, AssignmentStatus
from app.models.student import Student


class TransportService:
    def __init__(self, db: Session):
        self.db = db

    # ─── Routes CRUD ─────────────────────────────────────────────────────

    def get_routes(self, tenant_id: str, status: str = None, is_active: bool = None):
        q = self.db.query(TransportRoute).filter(TransportRoute.tenant_id == tenant_id)
        if status:
            q = q.filter(TransportRoute.status == status)
        if is_active is not None:
            q = q.filter(TransportRoute.is_active == is_active)
        routes = q.order_by(TransportRoute.route_name).all()
        return [self._route_dict(r) for r in routes], len(routes)

    def create_route(self, data: dict, tenant_id: str):
        route = TransportRoute(**data, tenant_id=tenant_id)
        self.db.add(route)
        self.db.commit()
        self.db.refresh(route)
        return self._route_dict(route)

    def update_route(self, route_id: int, data: dict, tenant_id: str):
        route = self.db.query(TransportRoute).filter(TransportRoute.id == route_id, TransportRoute.tenant_id == tenant_id).first()
        if not route:
            raise ValueError("Route not found")
        for k, v in data.items():
            if v is not None:
                setattr(route, k, v)
        self.db.commit()
        self.db.refresh(route)
        return self._route_dict(route)

    def delete_route(self, route_id: int, tenant_id: str):
        route = self.db.query(TransportRoute).filter(TransportRoute.id == route_id, TransportRoute.tenant_id == tenant_id).first()
        if not route:
            raise ValueError("Route not found")
        if route.current_students > 0:
            raise ValueError("Cannot delete route with active students")
        self.db.delete(route)
        self.db.commit()

    def _route_dict(self, r: TransportRoute) -> dict:
        vehicle = self.db.query(Vehicle).filter(Vehicle.id == r.vehicle_id).first() if r.vehicle_id else None
        return {
            "id": r.id, "tenant_id": r.tenant_id,
            "route_name": r.route_name, "route_code": r.route_code,
            "start_point": r.start_point, "end_point": r.end_point,
            "stops": r.stops, "distance_km": r.distance_km,
            "estimated_time_min": r.estimated_time_min,
            "morning_departure": r.morning_departure, "evening_departure": r.evening_departure,
            "monthly_fee": r.monthly_fee, "max_capacity": r.max_capacity,
            "current_students": r.current_students,
            "available_seats": r.max_capacity - r.current_students,
            "vehicle_id": r.vehicle_id,
            "vehicle_number": vehicle.vehicle_number if vehicle else None,
            "status": r.status.value if hasattr(r.status, 'value') else str(r.status),
            "description": r.description, "is_active": r.is_active,
            "created_at": r.created_at, "updated_at": r.updated_at,
        }

    # ─── Vehicles CRUD ───────────────────────────────────────────────────

    def get_vehicles(self, tenant_id: str, vehicle_type: str = None, status: str = None):
        q = self.db.query(Vehicle).filter(Vehicle.tenant_id == tenant_id)
        if vehicle_type:
            q = q.filter(Vehicle.vehicle_type == vehicle_type)
        if status:
            q = q.filter(Vehicle.status == status)
        vehicles = q.order_by(Vehicle.vehicle_number).all()
        return [self._vehicle_dict(v) for v in vehicles], len(vehicles)

    def create_vehicle(self, data: dict, tenant_id: str):
        # Handle date fields
        for f in ['insurance_expiry', 'fitness_expiry']:
            if data.get(f):
                data[f] = date.fromisoformat(data[f])
            else:
                data.pop(f, None)
        vehicle = Vehicle(**data, tenant_id=tenant_id)
        self.db.add(vehicle)
        self.db.commit()
        self.db.refresh(vehicle)
        return self._vehicle_dict(vehicle)

    def update_vehicle(self, vehicle_id: int, data: dict, tenant_id: str):
        vehicle = self.db.query(Vehicle).filter(Vehicle.id == vehicle_id, Vehicle.tenant_id == tenant_id).first()
        if not vehicle:
            raise ValueError("Vehicle not found")
        for f in ['insurance_expiry', 'fitness_expiry']:
            if data.get(f):
                data[f] = date.fromisoformat(data[f])
        for k, v in data.items():
            if v is not None:
                setattr(vehicle, k, v)
        self.db.commit()
        self.db.refresh(vehicle)
        return self._vehicle_dict(vehicle)

    def delete_vehicle(self, vehicle_id: int, tenant_id: str):
        vehicle = self.db.query(Vehicle).filter(Vehicle.id == vehicle_id, Vehicle.tenant_id == tenant_id).first()
        if not vehicle:
            raise ValueError("Vehicle not found")
        # Check if assigned to any routes
        assigned = self.db.query(TransportRoute).filter(TransportRoute.vehicle_id == vehicle_id, TransportRoute.tenant_id == tenant_id).count()
        if assigned > 0:
            raise ValueError("Cannot delete vehicle assigned to routes")
        self.db.delete(vehicle)
        self.db.commit()

    def _vehicle_dict(self, v: Vehicle) -> dict:
        assigned_routes = self.db.query(TransportRoute).filter(TransportRoute.vehicle_id == v.id).count()
        return {
            "id": v.id, "tenant_id": v.tenant_id,
            "vehicle_number": v.vehicle_number,
            "vehicle_type": v.vehicle_type.value if hasattr(v.vehicle_type, 'value') else str(v.vehicle_type),
            "make": v.make, "model": v.model, "year": v.year,
            "capacity": v.capacity,
            "driver_name": v.driver_name, "driver_phone": v.driver_phone,
            "driver_license": v.driver_license,
            "conductor_name": v.conductor_name, "conductor_phone": v.conductor_phone,
            "insurance_expiry": str(v.insurance_expiry) if v.insurance_expiry else None,
            "fitness_expiry": str(v.fitness_expiry) if v.fitness_expiry else None,
            "fuel_type": v.fuel_type, "gps_enabled": v.gps_enabled,
            "status": v.status.value if hasattr(v.status, 'value') else str(v.status),
            "description": v.description, "is_active": v.is_active,
            "assigned_routes": assigned_routes,
            "created_at": v.created_at, "updated_at": v.updated_at,
        }

    # ─── Assignments ─────────────────────────────────────────────────────

    def assign_student(self, data: dict, tenant_id: str):
        route = self.db.query(TransportRoute).filter(
            TransportRoute.id == data["route_id"], TransportRoute.tenant_id == tenant_id
        ).first()
        if not route:
            raise ValueError("Route not found")
        if route.current_students >= route.max_capacity:
            raise ValueError("Route is at maximum capacity")

        # Check student not already assigned
        existing = self.db.query(TransportAssignment).filter(
            TransportAssignment.student_id == data["student_id"],
            TransportAssignment.tenant_id == tenant_id,
            TransportAssignment.status == AssignmentStatus.active,
        ).first()
        if existing:
            raise ValueError("Student already has an active transport assignment")

        assign_date = date.fromisoformat(data["assignment_date"]) if data.get("assignment_date") else date.today()
        end_dt = date.fromisoformat(data["end_date"]) if data.get("end_date") else None

        assignment = TransportAssignment(
            student_id=data["student_id"], route_id=data["route_id"],
            pickup_stop=data.get("pickup_stop"), drop_stop=data.get("drop_stop"),
            assignment_date=assign_date, end_date=end_dt,
            monthly_fee=data.get("monthly_fee", route.monthly_fee),
            remarks=data.get("remarks"), tenant_id=tenant_id,
            status=AssignmentStatus.active,
        )
        self.db.add(assignment)
        route.current_students += 1
        self.db.commit()
        self.db.refresh(assignment)
        return self._assignment_dict(assignment)

    def cancel_assignment(self, assign_id: int, data: dict, tenant_id: str):
        assignment = self.db.query(TransportAssignment).filter(
            TransportAssignment.id == assign_id, TransportAssignment.tenant_id == tenant_id
        ).first()
        if not assignment:
            raise ValueError("Assignment not found")
        if assignment.status != AssignmentStatus.active:
            raise ValueError("Assignment is not active")

        end_dt = date.fromisoformat(data["end_date"]) if data.get("end_date") else date.today()
        assignment.end_date = end_dt
        assignment.status = AssignmentStatus.cancelled
        if data.get("remarks"):
            assignment.remarks = data["remarks"]

        route = self.db.query(TransportRoute).filter(TransportRoute.id == assignment.route_id).first()
        if route and route.current_students > 0:
            route.current_students -= 1

        self.db.commit()
        self.db.refresh(assignment)
        return self._assignment_dict(assignment)

    def get_assignments(self, tenant_id: str, route_id: int = None,
                        student_id: int = None, status: str = None):
        q = self.db.query(TransportAssignment).filter(TransportAssignment.tenant_id == tenant_id)
        if route_id:
            q = q.filter(TransportAssignment.route_id == route_id)
        if student_id:
            q = q.filter(TransportAssignment.student_id == student_id)
        if status:
            q = q.filter(TransportAssignment.status == status)
        assigns = q.order_by(TransportAssignment.assignment_date.desc()).all()
        return [self._assignment_dict(a) for a in assigns], len(assigns)

    def _assignment_dict(self, a: TransportAssignment) -> dict:
        route = self.db.query(TransportRoute).filter(TransportRoute.id == a.route_id).first()
        student = self.db.query(Student).filter(Student.id == a.student_id).first()
        student_name = f"{student.first_name} {student.last_name}" if student else None
        return {
            "id": a.id, "tenant_id": a.tenant_id,
            "student_id": a.student_id, "student_name": student_name,
            "route_id": a.route_id,
            "route_name": route.route_name if route else None,
            "route_code": route.route_code if route else None,
            "pickup_stop": a.pickup_stop, "drop_stop": a.drop_stop,
            "assignment_date": str(a.assignment_date),
            "end_date": str(a.end_date) if a.end_date else None,
            "monthly_fee": a.monthly_fee,
            "fee_paid_till": str(a.fee_paid_till) if a.fee_paid_till else None,
            "status": a.status.value if hasattr(a.status, 'value') else str(a.status),
            "remarks": a.remarks,
            "created_at": a.created_at, "updated_at": a.updated_at,
        }

    # ─── Fee Management ──────────────────────────────────────────────────

    def update_route_fee(self, route_id: int, monthly_fee: float, tenant_id: str):
        route = self.db.query(TransportRoute).filter(TransportRoute.id == route_id, TransportRoute.tenant_id == tenant_id).first()
        if not route:
            raise ValueError("Route not found")
        route.monthly_fee = monthly_fee
        self.db.commit()
        self.db.refresh(route)
        return self._route_dict(route)

    def update_assignment_fee(self, assign_id: int, monthly_fee: float, fee_paid_till: str, tenant_id: str):
        assignment = self.db.query(TransportAssignment).filter(
            TransportAssignment.id == assign_id, TransportAssignment.tenant_id == tenant_id
        ).first()
        if not assignment:
            raise ValueError("Assignment not found")
        assignment.monthly_fee = monthly_fee
        if fee_paid_till:
            assignment.fee_paid_till = date.fromisoformat(fee_paid_till)
        self.db.commit()
        self.db.refresh(assignment)
        return self._assignment_dict(assignment)

    # ─── Stats ───────────────────────────────────────────────────────────

    def get_stats(self, tenant_id: str):
        routes = self.db.query(TransportRoute).filter(TransportRoute.tenant_id == tenant_id, TransportRoute.is_active == True).all()
        vehicles = self.db.query(Vehicle).filter(Vehicle.tenant_id == tenant_id, Vehicle.is_active == True).count()
        active_assigns = self.db.query(TransportAssignment).filter(
            TransportAssignment.tenant_id == tenant_id, TransportAssignment.status == AssignmentStatus.active
        ).count()
        total_revenue = self.db.query(func.sum(TransportAssignment.monthly_fee)).filter(
            TransportAssignment.tenant_id == tenant_id, TransportAssignment.status == AssignmentStatus.active
        ).scalar() or 0

        total_capacity = sum(r.max_capacity for r in routes) or 1
        total_students = sum(r.current_students for r in routes)

        breakdown = []
        for r in routes:
            v = self.db.query(Vehicle).filter(Vehicle.id == r.vehicle_id).first() if r.vehicle_id else None
            breakdown.append({
                "route_id": r.id, "route_name": r.route_name, "route_code": r.route_code,
                "start_point": r.start_point, "end_point": r.end_point,
                "vehicle_number": v.vehicle_number if v else None,
                "max_capacity": r.max_capacity, "current_students": r.current_students,
                "available_seats": r.max_capacity - r.current_students,
                "monthly_fee": r.monthly_fee,
                "occupancy_rate": round((r.current_students / r.max_capacity * 100) if r.max_capacity > 0 else 0, 1),
            })

        return {
            "total_routes": len(routes), "total_vehicles": vehicles,
            "total_students": total_students, "active_assignments": active_assigns,
            "total_monthly_revenue": float(total_revenue),
            "avg_occupancy_rate": round((total_students / total_capacity * 100), 1),
            "route_breakdown": breakdown,
        }
