"""Add leave_types and leave_applications tables

Revision ID: 010_leaves
Revises: 009_attendance
Create Date: 2026-02-18
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '010_leaves'
down_revision: Union[str, None] = '009_attendance'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'leave_types',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('tenant_id', sa.String(length=50), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('code', sa.String(length=20), nullable=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('max_days_per_year', sa.Integer(), nullable=False, server_default='12'),
        sa.Column('is_paid', sa.Boolean(), nullable=False, server_default='1'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='1'),
        sa.Column('applies_to', sa.Enum('teacher', 'student', name='applicanttype'), nullable=False, server_default='teacher'),
        sa.Column('color', sa.String(length=10), nullable=False, server_default='#3D5EE1'),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_leave_types_id'), 'leave_types', ['id'])
    op.create_index(op.f('ix_leave_types_tenant_id'), 'leave_types', ['tenant_id'])

    op.create_table(
        'leave_applications',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('tenant_id', sa.String(length=50), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('applicant_type', sa.Enum('teacher', 'student', name='applicanttype'), nullable=False),
        sa.Column('teacher_id', sa.Integer(), nullable=True),
        sa.Column('student_id', sa.Integer(), nullable=True),
        sa.Column('leave_type_id', sa.Integer(), nullable=False),
        sa.Column('start_date', sa.Date(), nullable=False),
        sa.Column('end_date', sa.Date(), nullable=False),
        sa.Column('days', sa.Float(), nullable=False, server_default='1'),
        sa.Column('reason', sa.Text(), nullable=False),
        sa.Column('status', sa.Enum('pending', 'approved', 'rejected', 'cancelled', name='leavestatus'), nullable=False, server_default='pending'),
        sa.Column('admin_remarks', sa.Text(), nullable=True),
        sa.Column('approved_by', sa.Integer(), nullable=True),
        sa.Column('academic_year', sa.String(length=20), nullable=False, server_default='2025-26'),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id']),
        sa.ForeignKeyConstraint(['teacher_id'], ['teachers.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['student_id'], ['students.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['leave_type_id'], ['leave_types.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['approved_by'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_leave_applications_id'), 'leave_applications', ['id'])
    op.create_index(op.f('ix_leave_applications_tenant_id'), 'leave_applications', ['tenant_id'])
    op.create_index('ix_leave_applications_status', 'leave_applications', ['status'])
    op.create_index('ix_leave_applications_dates', 'leave_applications', ['start_date', 'end_date'])


def downgrade() -> None:
    op.drop_index('ix_leave_applications_dates', table_name='leave_applications')
    op.drop_index('ix_leave_applications_status', table_name='leave_applications')
    op.drop_index(op.f('ix_leave_applications_tenant_id'), table_name='leave_applications')
    op.drop_index(op.f('ix_leave_applications_id'), table_name='leave_applications')
    op.drop_table('leave_applications')
    op.drop_index(op.f('ix_leave_types_tenant_id'), table_name='leave_types')
    op.drop_index(op.f('ix_leave_types_id'), table_name='leave_types')
    op.drop_table('leave_types')
