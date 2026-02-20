"""
Transport Management models
"""
import enum
from sqlalchemy import Column, String, Integer, Float, Text, Boolean, Date, Enum, ForeignKey
from sqlalchemy.orm import relationship
from app.models.base import BaseModel


class VehicleType(str, enum.Enum):
    bus = "bus"
    mini_bus = "mini_bus"
    van = "van"
    car = "car"
    auto = "auto"


class VehicleStatus(str, enum.Enum):
    active = "active"
    maintenance = "maintenance"
    retired = "retired"
    reserved = "reserved"


class RouteStatus(str, enum.Enum):
    active = "active"
    inactive = "inactive"
    suspended = "suspended"


class AssignmentStatus(str, enum.Enum):
    active = "active"
    cancelled = "cancelled"
    transferred = "transferred"
    completed = "completed"


class TransportRoute(BaseModel):
    __tablename__ = "transport_routes"

    route_name = Column(String(200), nullable=False)
    route_code = Column(String(20), nullable=True)
    start_point = Column(String(200), nullable=False)
    end_point = Column(String(200), nullable=False)
    stops = Column(Text, nullable=True)  # JSON list of stops
    distance_km = Column(Float, nullable=True, default=0)
    estimated_time_min = Column(Integer, nullable=True, default=0)
    morning_departure = Column(String(10), nullable=True)   # HH:MM
    evening_departure = Column(String(10), nullable=True)   # HH:MM
    monthly_fee = Column(Float, nullable=False, default=0)
    max_capacity = Column(Integer, nullable=False, default=40)
    current_students = Column(Integer, nullable=False, default=0)
    vehicle_id = Column(Integer, ForeignKey("vehicles.id", ondelete="SET NULL"), nullable=True)
    status = Column(Enum(RouteStatus), nullable=False, default=RouteStatus.active)
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)

    vehicle = relationship("Vehicle", back_populates="routes")
    assignments = relationship("TransportAssignment", back_populates="route", lazy="dynamic")

    def __repr__(self):
        return f"<TransportRoute(name={self.route_name}, {self.start_point}->{self.end_point})>"


class Vehicle(BaseModel):
    __tablename__ = "vehicles"

    vehicle_number = Column(String(30), nullable=False)
    vehicle_type = Column(Enum(VehicleType), nullable=False, default=VehicleType.bus)
    make = Column(String(100), nullable=True)
    model = Column(String(100), nullable=True)
    year = Column(Integer, nullable=True)
    capacity = Column(Integer, nullable=False, default=40)
    driver_name = Column(String(200), nullable=True)
    driver_phone = Column(String(20), nullable=True)
    driver_license = Column(String(50), nullable=True)
    conductor_name = Column(String(200), nullable=True)
    conductor_phone = Column(String(20), nullable=True)
    insurance_expiry = Column(Date, nullable=True)
    fitness_expiry = Column(Date, nullable=True)
    fuel_type = Column(String(20), nullable=True, default="diesel")
    gps_enabled = Column(Boolean, default=False, nullable=False)
    status = Column(Enum(VehicleStatus), nullable=False, default=VehicleStatus.active)
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)

    routes = relationship("TransportRoute", back_populates="vehicle")

    def __repr__(self):
        return f"<Vehicle(number={self.vehicle_number}, type={self.vehicle_type})>"


class TransportAssignment(BaseModel):
    __tablename__ = "transport_assignments"

    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False)
    route_id = Column(Integer, ForeignKey("transport_routes.id", ondelete="CASCADE"), nullable=False)
    pickup_stop = Column(String(200), nullable=True)
    drop_stop = Column(String(200), nullable=True)
    assignment_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=True)
    monthly_fee = Column(Float, nullable=False, default=0)
    fee_paid_till = Column(Date, nullable=True)
    status = Column(Enum(AssignmentStatus), nullable=False, default=AssignmentStatus.active)
    remarks = Column(Text, nullable=True)

    route = relationship("TransportRoute", back_populates="assignments")

    def __repr__(self):
        return f"<TransportAssignment(student={self.student_id}, route={self.route_id})>"
