"""
Hostel Management models
"""
import enum
from sqlalchemy import Column, String, Integer, Float, Text, Boolean, Date, DateTime, Enum, ForeignKey
from sqlalchemy.orm import relationship
from app.models.base import BaseModel


class HostelType(str, enum.Enum):
    boys = "boys"
    girls = "girls"
    mixed = "mixed"
    staff = "staff"


class HostelRoomType(str, enum.Enum):
    single = "single"
    double = "double"
    triple = "triple"
    dormitory = "dormitory"


class HostelRoomStatus(str, enum.Enum):
    available = "available"
    occupied = "occupied"
    partially_occupied = "partially_occupied"
    maintenance = "maintenance"
    reserved = "reserved"


class AllocationStatus(str, enum.Enum):
    active = "active"
    vacated = "vacated"
    transferred = "transferred"
    expired = "expired"


class Hostel(BaseModel):
    __tablename__ = "hostels"

    name = Column(String(200), nullable=False)
    code = Column(String(20), nullable=True)
    hostel_type = Column(Enum(HostelType), nullable=False, default=HostelType.boys)
    address = Column(Text, nullable=True)
    warden_name = Column(String(200), nullable=True)
    warden_phone = Column(String(20), nullable=True)
    warden_email = Column(String(200), nullable=True)
    total_rooms = Column(Integer, nullable=False, default=0)
    total_beds = Column(Integer, nullable=False, default=0)
    occupied_beds = Column(Integer, nullable=False, default=0)
    monthly_fee = Column(Float, nullable=False, default=0)
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)

    rooms = relationship("HostelRoom", back_populates="hostel", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Hostel(name={self.name}, type={self.hostel_type})>"


class HostelRoom(BaseModel):
    __tablename__ = "hostel_rooms"

    hostel_id = Column(Integer, ForeignKey("hostels.id", ondelete="CASCADE"), nullable=False)
    room_number = Column(String(20), nullable=False)
    floor = Column(Integer, nullable=True, default=0)
    room_type = Column(Enum(HostelRoomType), nullable=False, default=HostelRoomType.double)
    capacity = Column(Integer, nullable=False, default=2)
    occupied = Column(Integer, nullable=False, default=0)
    status = Column(Enum(HostelRoomStatus), nullable=False, default=HostelRoomStatus.available)
    has_attached_bathroom = Column(Boolean, default=False, nullable=False)
    has_ac = Column(Boolean, default=False, nullable=False)
    has_wifi = Column(Boolean, default=False, nullable=False)
    monthly_rent = Column(Float, nullable=True, default=0)
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)

    hostel = relationship("Hostel", back_populates="rooms")
    allocations = relationship("RoomAllocation", back_populates="room", lazy="dynamic")

    def __repr__(self):
        return f"<HostelRoom(hostel_id={self.hostel_id}, room={self.room_number}, {self.occupied}/{self.capacity})>"


class RoomAllocation(BaseModel):
    __tablename__ = "room_allocations"

    hostel_id = Column(Integer, ForeignKey("hostels.id", ondelete="CASCADE"), nullable=False)
    room_id = Column(Integer, ForeignKey("hostel_rooms.id", ondelete="CASCADE"), nullable=False)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False)
    bed_number = Column(String(10), nullable=True)
    allocation_date = Column(Date, nullable=False)
    vacating_date = Column(Date, nullable=True)
    expected_vacating_date = Column(Date, nullable=True)
    status = Column(Enum(AllocationStatus), nullable=False, default=AllocationStatus.active)
    monthly_fee = Column(Float, nullable=False, default=0)
    fee_paid_till = Column(Date, nullable=True)
    remarks = Column(Text, nullable=True)

    room = relationship("HostelRoom", back_populates="allocations")

    def __repr__(self):
        return f"<RoomAllocation(student={self.student_id}, room={self.room_id}, status={self.status})>"
