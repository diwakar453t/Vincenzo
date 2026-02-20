"""
014 - Hostel Management tables

Revision ID: 014_hostel
Revises: 013_library
"""

revision = '014_hostel'
down_revision = '013_library'

from alembic import op
import sqlalchemy as sa


def upgrade():
    # Hostels
    op.create_table(
        'hostels',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('tenant_id', sa.String(50), sa.ForeignKey('tenants.id'), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column('name', sa.String(200), nullable=False),
        sa.Column('code', sa.String(20), nullable=True),
        sa.Column('hostel_type', sa.String(20), nullable=False, server_default='boys'),
        sa.Column('address', sa.Text(), nullable=True),
        sa.Column('warden_name', sa.String(200), nullable=True),
        sa.Column('warden_phone', sa.String(20), nullable=True),
        sa.Column('warden_email', sa.String(200), nullable=True),
        sa.Column('total_rooms', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('total_beds', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('occupied_beds', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('monthly_fee', sa.Float(), nullable=False, server_default='0'),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='1'),
    )
    op.create_index('ix_hostels_id', 'hostels', ['id'])
    op.create_index('ix_hostels_tenant_id', 'hostels', ['tenant_id'])

    # Hostel Rooms
    op.create_table(
        'hostel_rooms',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('tenant_id', sa.String(50), sa.ForeignKey('tenants.id'), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column('hostel_id', sa.Integer(), sa.ForeignKey('hostels.id', ondelete='CASCADE'), nullable=False),
        sa.Column('room_number', sa.String(20), nullable=False),
        sa.Column('floor', sa.Integer(), nullable=True, server_default='0'),
        sa.Column('room_type', sa.String(20), nullable=False, server_default='double'),
        sa.Column('capacity', sa.Integer(), nullable=False, server_default='2'),
        sa.Column('occupied', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('status', sa.String(25), nullable=False, server_default='available'),
        sa.Column('has_attached_bathroom', sa.Boolean(), nullable=False, server_default='0'),
        sa.Column('has_ac', sa.Boolean(), nullable=False, server_default='0'),
        sa.Column('has_wifi', sa.Boolean(), nullable=False, server_default='0'),
        sa.Column('monthly_rent', sa.Float(), nullable=True, server_default='0'),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='1'),
    )
    op.create_index('ix_hostel_rooms_id', 'hostel_rooms', ['id'])
    op.create_index('ix_hostel_rooms_tenant_id', 'hostel_rooms', ['tenant_id'])
    op.create_index('ix_hostel_rooms_hostel_id', 'hostel_rooms', ['hostel_id'])

    # Room Allocations
    op.create_table(
        'room_allocations',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('tenant_id', sa.String(50), sa.ForeignKey('tenants.id'), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column('hostel_id', sa.Integer(), sa.ForeignKey('hostels.id', ondelete='CASCADE'), nullable=False),
        sa.Column('room_id', sa.Integer(), sa.ForeignKey('hostel_rooms.id', ondelete='CASCADE'), nullable=False),
        sa.Column('student_id', sa.Integer(), sa.ForeignKey('students.id', ondelete='CASCADE'), nullable=False),
        sa.Column('bed_number', sa.String(10), nullable=True),
        sa.Column('allocation_date', sa.Date(), nullable=False),
        sa.Column('vacating_date', sa.Date(), nullable=True),
        sa.Column('expected_vacating_date', sa.Date(), nullable=True),
        sa.Column('status', sa.String(20), nullable=False, server_default='active'),
        sa.Column('monthly_fee', sa.Float(), nullable=False, server_default='0'),
        sa.Column('fee_paid_till', sa.Date(), nullable=True),
        sa.Column('remarks', sa.Text(), nullable=True),
    )
    op.create_index('ix_room_allocations_id', 'room_allocations', ['id'])
    op.create_index('ix_room_allocations_tenant_id', 'room_allocations', ['tenant_id'])
    op.create_index('ix_room_allocations_room_id', 'room_allocations', ['room_id'])
    op.create_index('ix_room_allocations_student_id', 'room_allocations', ['student_id'])
    op.create_index('ix_room_allocations_status', 'room_allocations', ['status'])


def downgrade():
    op.drop_table('room_allocations')
    op.drop_table('hostel_rooms')
    op.drop_table('hostels')
