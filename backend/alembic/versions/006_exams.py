"""Add exams and exam_schedules tables

Revision ID: 006_exams
Revises: 005_timetable
Create Date: 2026-02-18
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '006_exams'
down_revision: Union[str, None] = '005_timetable'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'exams',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('tenant_id', sa.String(length=50), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('name', sa.String(length=200), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('exam_type', sa.String(length=30), nullable=False, server_default='mid_term'),
        sa.Column('academic_year', sa.String(length=20), nullable=False),
        sa.Column('status', sa.String(length=20), nullable=False, server_default='upcoming'),
        sa.Column('start_date', sa.Date(), nullable=True),
        sa.Column('end_date', sa.Date(), nullable=True),
        sa.Column('class_id', sa.Integer(), nullable=False),
        sa.Column('total_marks', sa.Float(), nullable=False, server_default='100'),
        sa.Column('passing_marks', sa.Float(), nullable=False, server_default='35'),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id']),
        sa.ForeignKeyConstraint(['class_id'], ['classes.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_exams_id'), 'exams', ['id'])
    op.create_index(op.f('ix_exams_tenant_id'), 'exams', ['tenant_id'])

    op.create_table(
        'exam_schedules',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('tenant_id', sa.String(length=50), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('exam_id', sa.Integer(), nullable=False),
        sa.Column('subject_id', sa.Integer(), nullable=False),
        sa.Column('exam_date', sa.Date(), nullable=False),
        sa.Column('start_time', sa.String(length=10), nullable=False),
        sa.Column('end_time', sa.String(length=10), nullable=False),
        sa.Column('room_id', sa.Integer(), nullable=True),
        sa.Column('max_marks', sa.Float(), nullable=False, server_default='100'),
        sa.Column('passing_marks', sa.Float(), nullable=False, server_default='35'),
        sa.Column('instructions', sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id']),
        sa.ForeignKeyConstraint(['exam_id'], ['exams.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['subject_id'], ['subjects.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['room_id'], ['rooms.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_exam_schedules_id'), 'exam_schedules', ['id'])
    op.create_index(op.f('ix_exam_schedules_tenant_id'), 'exam_schedules', ['tenant_id'])


def downgrade() -> None:
    op.drop_index(op.f('ix_exam_schedules_tenant_id'), table_name='exam_schedules')
    op.drop_index(op.f('ix_exam_schedules_id'), table_name='exam_schedules')
    op.drop_table('exam_schedules')
    op.drop_index(op.f('ix_exams_tenant_id'), table_name='exams')
    op.drop_index(op.f('ix_exams_id'), table_name='exams')
    op.drop_table('exams')
