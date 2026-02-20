"""Add student and staff attendance tables

Revision ID: 009_attendance
Revises: 008_departments
Create Date: 2026-02-18
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '009_attendance'
down_revision: Union[str, None] = '008_departments'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'student_attendance',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('tenant_id', sa.String(length=50), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('student_id', sa.Integer(), nullable=False),
        sa.Column('class_id', sa.Integer(), nullable=False),
        sa.Column('date', sa.Date(), nullable=False),
        sa.Column('status', sa.Enum('present', 'absent', 'late', 'half_day', 'excused', name='attendancestatus'), nullable=False),
        sa.Column('remarks', sa.Text(), nullable=True),
        sa.Column('academic_year', sa.String(length=20), nullable=False, server_default='2025-26'),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id']),
        sa.ForeignKeyConstraint(['student_id'], ['students.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['class_id'], ['classes.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_student_attendance_id'), 'student_attendance', ['id'])
    op.create_index(op.f('ix_student_attendance_tenant_id'), 'student_attendance', ['tenant_id'])
    op.create_index('ix_student_attendance_date', 'student_attendance', ['date'])
    op.create_index('ix_student_attendance_student_date', 'student_attendance', ['student_id', 'date'], unique=False)

    op.create_table(
        'staff_attendance',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('tenant_id', sa.String(length=50), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('teacher_id', sa.Integer(), nullable=False),
        sa.Column('date', sa.Date(), nullable=False),
        sa.Column('status', sa.Enum('present', 'absent', 'late', 'half_day', 'excused', name='attendancestatus'), nullable=False),
        sa.Column('check_in', sa.String(length=10), nullable=True),
        sa.Column('check_out', sa.String(length=10), nullable=True),
        sa.Column('remarks', sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id']),
        sa.ForeignKeyConstraint(['teacher_id'], ['teachers.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_staff_attendance_id'), 'staff_attendance', ['id'])
    op.create_index(op.f('ix_staff_attendance_tenant_id'), 'staff_attendance', ['tenant_id'])
    op.create_index('ix_staff_attendance_date', 'staff_attendance', ['date'])
    op.create_index('ix_staff_attendance_teacher_date', 'staff_attendance', ['teacher_id', 'date'], unique=False)


def downgrade() -> None:
    op.drop_index('ix_staff_attendance_teacher_date', table_name='staff_attendance')
    op.drop_index('ix_staff_attendance_date', table_name='staff_attendance')
    op.drop_index(op.f('ix_staff_attendance_tenant_id'), table_name='staff_attendance')
    op.drop_index(op.f('ix_staff_attendance_id'), table_name='staff_attendance')
    op.drop_table('staff_attendance')
    op.drop_index('ix_student_attendance_student_date', table_name='student_attendance')
    op.drop_index('ix_student_attendance_date', table_name='student_attendance')
    op.drop_index(op.f('ix_student_attendance_tenant_id'), table_name='student_attendance')
    op.drop_index(op.f('ix_student_attendance_id'), table_name='student_attendance')
    op.drop_table('student_attendance')
