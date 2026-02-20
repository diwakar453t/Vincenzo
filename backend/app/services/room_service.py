from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional

from app.models.room import Room, RoomStatus
from app.models.class_model import Class
from app.models.student import Student
from app.schemas.room import RoomCreate, RoomUpdate


class RoomService:
    """Service for room management operations"""

    def __init__(self, db: Session):
        self.db = db

    def get_rooms(
        self,
        tenant_id: str,
        skip: int = 0,
        limit: int = 50,
        search: Optional[str] = None,
        room_type: Optional[str] = None,
        status: Optional[str] = None,
        building: Optional[str] = None,
    ) -> tuple[List[Room], int]:
        """Get paginated list of rooms with optional filters"""
        query = self.db.query(Room).filter(Room.tenant_id == tenant_id)

        if search:
            search_term = f"%{search}%"
            query = query.filter(
                (Room.room_number.ilike(search_term))
                | (Room.name.ilike(search_term))
                | (Room.building.ilike(search_term))
            )

        if room_type:
            query = query.filter(Room.room_type == room_type)

        if status:
            query = query.filter(Room.status == status)

        if building:
            query = query.filter(Room.building == building)

        total = query.count()
        rooms = query.order_by(Room.room_number).offset(skip).limit(limit).all()

        return rooms, total

    def get_room(self, room_id: int, tenant_id: str) -> Optional[Room]:
        """Get a single room by ID"""
        return (
            self.db.query(Room)
            .filter(Room.id == room_id, Room.tenant_id == tenant_id)
            .first()
        )

    def get_room_by_number(self, room_number: str, tenant_id: str) -> Optional[Room]:
        """Get a room by its room number"""
        return (
            self.db.query(Room)
            .filter(Room.room_number == room_number, Room.tenant_id == tenant_id)
            .first()
        )

    def create_room(self, room_data: RoomCreate, tenant_id: str) -> Room:
        """Create a new room"""
        existing = self.get_room_by_number(room_data.room_number, tenant_id)
        if existing:
            raise ValueError(f"Room with number {room_data.room_number} already exists")

        room = Room(**room_data.model_dump(), tenant_id=tenant_id)
        self.db.add(room)
        self.db.commit()
        self.db.refresh(room)
        return room

    def update_room(
        self, room_id: int, room_data: RoomUpdate, tenant_id: str
    ) -> Optional[Room]:
        """Update an existing room"""
        room = self.get_room(room_id, tenant_id)
        if not room:
            return None

        update_data = room_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(room, field, value)

        self.db.commit()
        self.db.refresh(room)
        return room

    def delete_room(self, room_id: int, tenant_id: str) -> bool:
        """Delete a room (only if no classes assigned)"""
        room = self.get_room(room_id, tenant_id)
        if not room:
            return False

        assigned_count = (
            self.db.query(Class)
            .filter(Class.room_id == room_id, Class.tenant_id == tenant_id)
            .count()
        )
        if assigned_count > 0:
            raise ValueError("Cannot delete room with assigned classes. Unassign classes first.")

        self.db.delete(room)
        self.db.commit()
        return True

    def assign_room_to_class(
        self, room_id: int, class_id: int, tenant_id: str
    ) -> bool:
        """Assign a room to a class"""
        room = self.get_room(room_id, tenant_id)
        if not room:
            return False

        class_obj = (
            self.db.query(Class)
            .filter(Class.id == class_id, Class.tenant_id == tenant_id)
            .first()
        )
        if not class_obj:
            return False

        class_obj.room_id = room_id
        class_obj.room_number = room.room_number
        self.db.commit()
        return True

    def unassign_room_from_class(self, class_id: int, tenant_id: str) -> bool:
        """Remove room assignment from a class"""
        class_obj = (
            self.db.query(Class)
            .filter(Class.id == class_id, Class.tenant_id == tenant_id)
            .first()
        )
        if not class_obj:
            return False

        class_obj.room_id = None
        class_obj.room_number = None
        self.db.commit()
        return True

    def get_room_occupancy(self, room_id: int, tenant_id: str) -> int:
        """Get total student count across all classes assigned to a room"""
        return (
            self.db.query(func.count(Student.id))
            .join(Class, Student.class_id == Class.id)
            .filter(Class.room_id == room_id, Class.tenant_id == tenant_id)
            .scalar()
            or 0
        )

    def get_room_capacity_info(self, room_id: int, tenant_id: str) -> dict:
        """Get detailed capacity info for a room"""
        room = self.get_room(room_id, tenant_id)
        if not room:
            return {}

        occupancy = self.get_room_occupancy(room_id, tenant_id)
        assigned_classes = (
            self.db.query(Class)
            .filter(Class.room_id == room_id, Class.tenant_id == tenant_id)
            .all()
        )

        return {
            "room_id": room_id,
            "room_number": room.room_number,
            "capacity": room.capacity,
            "current_occupancy": occupancy,
            "available_seats": max(0, room.capacity - occupancy),
            "occupancy_percentage": round((occupancy / room.capacity * 100), 1) if room.capacity > 0 else 0,
            "assigned_classes": len(assigned_classes),
            "is_overcapacity": occupancy > room.capacity,
        }
