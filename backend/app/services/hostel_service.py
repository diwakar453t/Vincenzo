"""
Hostel Management service
"""
from datetime import date
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.hostel import Hostel, HostelRoom, RoomAllocation, HostelRoomStatus, AllocationStatus
from app.models.student import Student


class HostelService:
    def __init__(self, db: Session):
        self.db = db

    # ─── Hostels CRUD ────────────────────────────────────────────────────

    def get_hostels(self, tenant_id: str, hostel_type: str = None, is_active: bool = None):
        q = self.db.query(Hostel).filter(Hostel.tenant_id == tenant_id)
        if hostel_type:
            q = q.filter(Hostel.hostel_type == hostel_type)
        if is_active is not None:
            q = q.filter(Hostel.is_active == is_active)
        hostels = q.order_by(Hostel.name).all()
        return [self._hostel_dict(h) for h in hostels], len(hostels)

    def create_hostel(self, data: dict, tenant_id: str):
        hostel = Hostel(**data, tenant_id=tenant_id)
        self.db.add(hostel)
        self.db.commit()
        self.db.refresh(hostel)
        return self._hostel_dict(hostel)

    def update_hostel(self, hostel_id: int, data: dict, tenant_id: str):
        hostel = self.db.query(Hostel).filter(Hostel.id == hostel_id, Hostel.tenant_id == tenant_id).first()
        if not hostel:
            raise ValueError("Hostel not found")
        for k, v in data.items():
            if v is not None:
                setattr(hostel, k, v)
        self.db.commit()
        self.db.refresh(hostel)
        return self._hostel_dict(hostel)

    def delete_hostel(self, hostel_id: int, tenant_id: str):
        hostel = self.db.query(Hostel).filter(Hostel.id == hostel_id, Hostel.tenant_id == tenant_id).first()
        if not hostel:
            raise ValueError("Hostel not found")
        self.db.delete(hostel)
        self.db.commit()

    def _hostel_dict(self, h: Hostel) -> dict:
        return {
            "id": h.id, "tenant_id": h.tenant_id, "name": h.name, "code": h.code,
            "hostel_type": h.hostel_type.value if hasattr(h.hostel_type, 'value') else str(h.hostel_type),
            "address": h.address, "warden_name": h.warden_name,
            "warden_phone": h.warden_phone, "warden_email": h.warden_email,
            "total_rooms": h.total_rooms, "total_beds": h.total_beds,
            "occupied_beds": h.occupied_beds, "available_beds": h.total_beds - h.occupied_beds,
            "monthly_fee": h.monthly_fee, "description": h.description,
            "is_active": h.is_active, "created_at": h.created_at, "updated_at": h.updated_at,
        }

    # ─── Hostel Rooms CRUD ───────────────────────────────────────────────

    def get_rooms(self, tenant_id: str, hostel_id: int = None, status: str = None,
                  room_type: str = None, skip: int = 0, limit: int = 100):
        q = self.db.query(HostelRoom).filter(HostelRoom.tenant_id == tenant_id)
        if hostel_id:
            q = q.filter(HostelRoom.hostel_id == hostel_id)
        if status:
            q = q.filter(HostelRoom.status == status)
        if room_type:
            q = q.filter(HostelRoom.room_type == room_type)
        total = q.count()
        rooms = q.order_by(HostelRoom.room_number).offset(skip).limit(limit).all()
        return [self._room_dict(r) for r in rooms], total

    def create_room(self, data: dict, tenant_id: str):
        hostel = self.db.query(Hostel).filter(Hostel.id == data["hostel_id"], Hostel.tenant_id == tenant_id).first()
        if not hostel:
            raise ValueError("Hostel not found")
        room = HostelRoom(**data, tenant_id=tenant_id)
        self.db.add(room)
        hostel.total_rooms += 1
        hostel.total_beds += data.get("capacity", 2)
        self.db.commit()
        self.db.refresh(room)
        return self._room_dict(room)

    def update_room(self, room_id: int, data: dict, tenant_id: str):
        room = self.db.query(HostelRoom).filter(HostelRoom.id == room_id, HostelRoom.tenant_id == tenant_id).first()
        if not room:
            raise ValueError("Room not found")
        old_cap = room.capacity
        for k, v in data.items():
            if v is not None:
                setattr(room, k, v)
        # Update hostel bed count if capacity changed
        if "capacity" in data and data["capacity"] is not None and data["capacity"] != old_cap:
            hostel = self.db.query(Hostel).filter(Hostel.id == room.hostel_id).first()
            if hostel:
                hostel.total_beds += (data["capacity"] - old_cap)
        self.db.commit()
        self.db.refresh(room)
        return self._room_dict(room)

    def delete_room(self, room_id: int, tenant_id: str):
        room = self.db.query(HostelRoom).filter(HostelRoom.id == room_id, HostelRoom.tenant_id == tenant_id).first()
        if not room:
            raise ValueError("Room not found")
        if room.occupied > 0:
            raise ValueError("Cannot delete room with active occupants")
        hostel = self.db.query(Hostel).filter(Hostel.id == room.hostel_id).first()
        if hostel:
            hostel.total_rooms = max(0, hostel.total_rooms - 1)
            hostel.total_beds = max(0, hostel.total_beds - room.capacity)
        self.db.delete(room)
        self.db.commit()

    def _room_dict(self, r: HostelRoom) -> dict:
        hostel = self.db.query(Hostel).filter(Hostel.id == r.hostel_id).first()
        return {
            "id": r.id, "tenant_id": r.tenant_id, "hostel_id": r.hostel_id,
            "hostel_name": hostel.name if hostel else None,
            "room_number": r.room_number, "floor": r.floor,
            "room_type": r.room_type.value if hasattr(r.room_type, 'value') else str(r.room_type),
            "capacity": r.capacity, "occupied": r.occupied,
            "available": r.capacity - r.occupied,
            "status": r.status.value if hasattr(r.status, 'value') else str(r.status),
            "has_attached_bathroom": r.has_attached_bathroom,
            "has_ac": r.has_ac, "has_wifi": r.has_wifi,
            "monthly_rent": r.monthly_rent, "description": r.description,
            "is_active": r.is_active, "created_at": r.created_at, "updated_at": r.updated_at,
        }

    # ─── Room Allocation ─────────────────────────────────────────────────

    def allocate_room(self, data: dict, tenant_id: str):
        room = self.db.query(HostelRoom).filter(
            HostelRoom.id == data["room_id"], HostelRoom.tenant_id == tenant_id
        ).first()
        if not room:
            raise ValueError("Room not found")
        if room.occupied >= room.capacity:
            raise ValueError("Room is fully occupied")

        # Check student not already allocated
        existing = self.db.query(RoomAllocation).filter(
            RoomAllocation.student_id == data["student_id"],
            RoomAllocation.tenant_id == tenant_id,
            RoomAllocation.status == AllocationStatus.active,
        ).first()
        if existing:
            raise ValueError("Student already has an active room allocation")

        alloc_date = date.fromisoformat(data["allocation_date"]) if data.get("allocation_date") else date.today()
        exp_vacate = date.fromisoformat(data["expected_vacating_date"]) if data.get("expected_vacating_date") else None

        alloc = RoomAllocation(
            hostel_id=data["hostel_id"], room_id=data["room_id"],
            student_id=data["student_id"], bed_number=data.get("bed_number"),
            allocation_date=alloc_date, expected_vacating_date=exp_vacate,
            monthly_fee=data.get("monthly_fee", 0), remarks=data.get("remarks"),
            tenant_id=tenant_id, status=AllocationStatus.active,
        )
        self.db.add(alloc)

        room.occupied += 1
        if room.occupied >= room.capacity:
            room.status = HostelRoomStatus.occupied
        else:
            room.status = HostelRoomStatus.partially_occupied

        hostel = self.db.query(Hostel).filter(Hostel.id == room.hostel_id).first()
        if hostel:
            hostel.occupied_beds += 1

        self.db.commit()
        self.db.refresh(alloc)
        return self._alloc_dict(alloc)

    def vacate_room(self, alloc_id: int, data: dict, tenant_id: str):
        alloc = self.db.query(RoomAllocation).filter(
            RoomAllocation.id == alloc_id, RoomAllocation.tenant_id == tenant_id
        ).first()
        if not alloc:
            raise ValueError("Allocation not found")
        if alloc.status != AllocationStatus.active:
            raise ValueError("Allocation is not active")

        vacate_date = date.fromisoformat(data["vacating_date"]) if data.get("vacating_date") else date.today()
        alloc.vacating_date = vacate_date
        alloc.status = AllocationStatus.vacated
        if data.get("remarks"):
            alloc.remarks = data["remarks"]

        room = self.db.query(HostelRoom).filter(HostelRoom.id == alloc.room_id).first()
        if room and room.occupied > 0:
            room.occupied -= 1
            if room.occupied == 0:
                room.status = HostelRoomStatus.available
            else:
                room.status = HostelRoomStatus.partially_occupied

        hostel = self.db.query(Hostel).filter(Hostel.id == alloc.hostel_id).first()
        if hostel and hostel.occupied_beds > 0:
            hostel.occupied_beds -= 1

        self.db.commit()
        self.db.refresh(alloc)
        return self._alloc_dict(alloc)

    def get_allocations(self, tenant_id: str, hostel_id: int = None, room_id: int = None,
                        student_id: int = None, status: str = None, skip: int = 0, limit: int = 100):
        q = self.db.query(RoomAllocation).filter(RoomAllocation.tenant_id == tenant_id)
        if hostel_id:
            q = q.filter(RoomAllocation.hostel_id == hostel_id)
        if room_id:
            q = q.filter(RoomAllocation.room_id == room_id)
        if student_id:
            q = q.filter(RoomAllocation.student_id == student_id)
        if status:
            q = q.filter(RoomAllocation.status == status)
        total = q.count()
        allocs = q.order_by(RoomAllocation.allocation_date.desc()).offset(skip).limit(limit).all()
        return [self._alloc_dict(a) for a in allocs], total

    def get_residents(self, tenant_id: str, hostel_id: int = None):
        q = self.db.query(RoomAllocation).filter(
            RoomAllocation.tenant_id == tenant_id,
            RoomAllocation.status == AllocationStatus.active,
        )
        if hostel_id:
            q = q.filter(RoomAllocation.hostel_id == hostel_id)
        allocs = q.order_by(RoomAllocation.allocation_date).all()
        return [self._alloc_dict(a) for a in allocs], len(allocs)

    def _alloc_dict(self, a: RoomAllocation) -> dict:
        room = self.db.query(HostelRoom).filter(HostelRoom.id == a.room_id).first()
        hostel = self.db.query(Hostel).filter(Hostel.id == a.hostel_id).first()
        student = self.db.query(Student).filter(Student.id == a.student_id).first()
        student_name = f"{student.first_name} {student.last_name}" if student else None
        return {
            "id": a.id, "tenant_id": a.tenant_id,
            "hostel_id": a.hostel_id, "hostel_name": hostel.name if hostel else None,
            "room_id": a.room_id, "room_number": room.room_number if room else None,
            "student_id": a.student_id, "student_name": student_name,
            "bed_number": a.bed_number,
            "allocation_date": str(a.allocation_date),
            "vacating_date": str(a.vacating_date) if a.vacating_date else None,
            "expected_vacating_date": str(a.expected_vacating_date) if a.expected_vacating_date else None,
            "status": a.status.value if hasattr(a.status, 'value') else str(a.status),
            "monthly_fee": a.monthly_fee,
            "fee_paid_till": str(a.fee_paid_till) if a.fee_paid_till else None,
            "remarks": a.remarks,
            "created_at": a.created_at, "updated_at": a.updated_at,
        }

    # ─── Room Availability ───────────────────────────────────────────────

    def get_availability(self, tenant_id: str, hostel_id: int = None):
        q = self.db.query(HostelRoom).filter(
            HostelRoom.tenant_id == tenant_id, HostelRoom.is_active == True
        )
        if hostel_id:
            q = q.filter(HostelRoom.hostel_id == hostel_id)
        rooms = q.order_by(HostelRoom.hostel_id, HostelRoom.room_number).all()
        return [self._room_dict(r) for r in rooms if r.occupied < r.capacity], \
               len([r for r in rooms if r.occupied < r.capacity])

    # ─── Hostel Fee Management ───────────────────────────────────────────

    def update_hostel_fees(self, hostel_id: int, monthly_fee: float, tenant_id: str):
        hostel = self.db.query(Hostel).filter(Hostel.id == hostel_id, Hostel.tenant_id == tenant_id).first()
        if not hostel:
            raise ValueError("Hostel not found")
        hostel.monthly_fee = monthly_fee
        self.db.commit()
        self.db.refresh(hostel)
        return self._hostel_dict(hostel)

    def update_allocation_fee(self, alloc_id: int, monthly_fee: float, fee_paid_till: str, tenant_id: str):
        alloc = self.db.query(RoomAllocation).filter(
            RoomAllocation.id == alloc_id, RoomAllocation.tenant_id == tenant_id
        ).first()
        if not alloc:
            raise ValueError("Allocation not found")
        alloc.monthly_fee = monthly_fee
        if fee_paid_till:
            alloc.fee_paid_till = date.fromisoformat(fee_paid_till)
        self.db.commit()
        self.db.refresh(alloc)
        return self._alloc_dict(alloc)

    # ─── Stats ───────────────────────────────────────────────────────────

    def get_stats(self, tenant_id: str):
        hostels = self.db.query(Hostel).filter(Hostel.tenant_id == tenant_id, Hostel.is_active == True).all()
        total_rooms = sum(h.total_rooms for h in hostels)
        total_beds = sum(h.total_beds for h in hostels)
        occupied = sum(h.occupied_beds for h in hostels)
        residents = self.db.query(RoomAllocation).filter(
            RoomAllocation.tenant_id == tenant_id, RoomAllocation.status == AllocationStatus.active
        ).count()
        total_revenue = self.db.query(func.sum(RoomAllocation.monthly_fee)).filter(
            RoomAllocation.tenant_id == tenant_id, RoomAllocation.status == AllocationStatus.active
        ).scalar() or 0

        breakdown = []
        for h in hostels:
            breakdown.append({
                "hostel_id": h.id, "name": h.name, "type": h.hostel_type.value if hasattr(h.hostel_type, 'value') else str(h.hostel_type),
                "total_rooms": h.total_rooms, "total_beds": h.total_beds,
                "occupied_beds": h.occupied_beds, "available_beds": h.total_beds - h.occupied_beds,
                "occupancy_rate": round((h.occupied_beds / h.total_beds * 100) if h.total_beds > 0 else 0, 1),
            })

        return {
            "total_hostels": len(hostels), "total_rooms": total_rooms,
            "total_beds": total_beds, "occupied_beds": occupied,
            "available_beds": total_beds - occupied, "total_residents": residents,
            "occupancy_rate": round((occupied / total_beds * 100) if total_beds > 0 else 0, 1),
            "total_monthly_revenue": float(total_revenue),
            "hostel_breakdown": breakdown,
        }
