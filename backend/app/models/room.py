from sqlalchemy import Column, Integer, String, Boolean, Text
from sqlalchemy.orm import relationship
from app.models.base import BaseModel
import enum


class RoomType(str, enum.Enum):
    """Room type enumeration."""
    CLASSROOM = "classroom"
    LABORATORY = "laboratory"
    COMPUTER_LAB = "computer_lab"
    LIBRARY = "library"
    AUDITORIUM = "auditorium"
    SPORTS_HALL = "sports_hall"
    STAFF_ROOM = "staff_room"
    OTHER = "other"


class RoomStatus(str, enum.Enum):
    """Room status enumeration."""
    AVAILABLE = "available"
    OCCUPIED = "occupied"
    MAINTENANCE = "maintenance"
    RESERVED = "reserved"


class Room(BaseModel):
    """Room model for managing physical rooms/spaces in the school."""

    __tablename__ = "rooms"

    # Basic Information
    room_number = Column(String(20), nullable=False, index=True)
    name = Column(String(100), nullable=True)
    building = Column(String(100), nullable=True)
    floor = Column(Integer, nullable=True)

    # Type & Capacity
    room_type = Column(String(30), default=RoomType.CLASSROOM.value, nullable=False)
    capacity = Column(Integer, default=40, nullable=False)

    # Status
    status = Column(String(20), default=RoomStatus.AVAILABLE.value, nullable=False)

    # Amenities
    has_projector = Column(Boolean, default=False)
    has_ac = Column(Boolean, default=False)
    has_whiteboard = Column(Boolean, default=True)
    has_smartboard = Column(Boolean, default=False)
    description = Column(Text, nullable=True)

    # Relationships — classes assigned to this room
    classes = relationship("Class", back_populates="room", foreign_keys="Class.room_id")

    def __repr__(self):
        return f"<Room(room_number='{self.room_number}', type='{self.room_type}')>"

    @property
    def display_name(self):
        if self.name:
            return f"{self.room_number} - {self.name}"
        return self.room_number
