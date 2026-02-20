"""
015 - Transport Management tables

Revision ID: 015_transport
Revises: 014_hostel
"""

revision = '015_transport'
down_revision = '014_hostel'

from alembic import op
import sqlalchemy as sa


def upgrade():
    # Vehicles (must come first because transport_routes references it)
    op.create_table(
        'vehicles',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('tenant_id', sa.String(50), sa.ForeignKey('tenants.id'), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column('vehicle_number', sa.String(30), nullable=False),
        sa.Column('vehicle_type', sa.String(20), nullable=False, server_default='bus'),
        sa.Column('make', sa.String(100), nullable=True),
        sa.Column('model', sa.String(100), nullable=True),
        sa.Column('year', sa.Integer(), nullable=True),
        sa.Column('capacity', sa.Integer(), nullable=False, server_default='40'),
        sa.Column('driver_name', sa.String(200), nullable=True),
        sa.Column('driver_phone', sa.String(20), nullable=True),
        sa.Column('driver_license', sa.String(50), nullable=True),
        sa.Column('conductor_name', sa.String(200), nullable=True),
        sa.Column('conductor_phone', sa.String(20), nullable=True),
        sa.Column('insurance_expiry', sa.Date(), nullable=True),
        sa.Column('fitness_expiry', sa.Date(), nullable=True),
        sa.Column('fuel_type', sa.String(20), nullable=True, server_default='diesel'),
        sa.Column('gps_enabled', sa.Boolean(), nullable=False, server_default='0'),
        sa.Column('status', sa.String(20), nullable=False, server_default='active'),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='1'),
    )
    op.create_index('ix_vehicles_id', 'vehicles', ['id'])
    op.create_index('ix_vehicles_tenant_id', 'vehicles', ['tenant_id'])

    # Transport Routes
    op.create_table(
        'transport_routes',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('tenant_id', sa.String(50), sa.ForeignKey('tenants.id'), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column('route_name', sa.String(200), nullable=False),
        sa.Column('route_code', sa.String(20), nullable=True),
        sa.Column('start_point', sa.String(200), nullable=False),
        sa.Column('end_point', sa.String(200), nullable=False),
        sa.Column('stops', sa.Text(), nullable=True),
        sa.Column('distance_km', sa.Float(), nullable=True, server_default='0'),
        sa.Column('estimated_time_min', sa.Integer(), nullable=True, server_default='0'),
        sa.Column('morning_departure', sa.String(10), nullable=True),
        sa.Column('evening_departure', sa.String(10), nullable=True),
        sa.Column('monthly_fee', sa.Float(), nullable=False, server_default='0'),
        sa.Column('max_capacity', sa.Integer(), nullable=False, server_default='40'),
        sa.Column('current_students', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('vehicle_id', sa.Integer(), sa.ForeignKey('vehicles.id', ondelete='SET NULL'), nullable=True),
        sa.Column('status', sa.String(20), nullable=False, server_default='active'),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='1'),
    )
    op.create_index('ix_transport_routes_id', 'transport_routes', ['id'])
    op.create_index('ix_transport_routes_tenant_id', 'transport_routes', ['tenant_id'])

    # Transport Assignments
    op.create_table(
        'transport_assignments',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('tenant_id', sa.String(50), sa.ForeignKey('tenants.id'), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column('student_id', sa.Integer(), sa.ForeignKey('students.id', ondelete='CASCADE'), nullable=False),
        sa.Column('route_id', sa.Integer(), sa.ForeignKey('transport_routes.id', ondelete='CASCADE'), nullable=False),
        sa.Column('pickup_stop', sa.String(200), nullable=True),
        sa.Column('drop_stop', sa.String(200), nullable=True),
        sa.Column('assignment_date', sa.Date(), nullable=False),
        sa.Column('end_date', sa.Date(), nullable=True),
        sa.Column('monthly_fee', sa.Float(), nullable=False, server_default='0'),
        sa.Column('fee_paid_till', sa.Date(), nullable=True),
        sa.Column('status', sa.String(20), nullable=False, server_default='active'),
        sa.Column('remarks', sa.Text(), nullable=True),
    )
    op.create_index('ix_transport_assignments_id', 'transport_assignments', ['id'])
    op.create_index('ix_transport_assignments_tenant_id', 'transport_assignments', ['tenant_id'])
    op.create_index('ix_transport_assignments_student_id', 'transport_assignments', ['student_id'])
    op.create_index('ix_transport_assignments_route_id', 'transport_assignments', ['route_id'])
    op.create_index('ix_transport_assignments_status', 'transport_assignments', ['status'])


def downgrade():
    op.drop_table('transport_assignments')
    op.drop_table('transport_routes')
    op.drop_table('vehicles')
