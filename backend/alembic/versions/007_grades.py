"""Add grade_categories and grades tables

Revision ID: 007_grades
Revises: 006_exams
Create Date: 2026-02-18
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '007_grades'
down_revision: Union[str, None] = '006_exams'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'grade_categories',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('tenant_id', sa.String(length=50), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('name', sa.String(length=20), nullable=False),
        sa.Column('min_percentage', sa.Float(), nullable=False),
        sa.Column('max_percentage', sa.Float(), nullable=False),
        sa.Column('grade_point', sa.Float(), nullable=False),
        sa.Column('description', sa.String(length=100), nullable=True),
        sa.Column('is_passing', sa.Boolean(), nullable=False, server_default='1'),
        sa.Column('order', sa.Integer(), nullable=False, server_default='0'),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_grade_categories_id'), 'grade_categories', ['id'])
    op.create_index(op.f('ix_grade_categories_tenant_id'), 'grade_categories', ['tenant_id'])

    op.create_table(
        'grades',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('tenant_id', sa.String(length=50), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('student_id', sa.Integer(), nullable=False),
        sa.Column('exam_id', sa.Integer(), nullable=False),
        sa.Column('subject_id', sa.Integer(), nullable=False),
        sa.Column('class_id', sa.Integer(), nullable=False),
        sa.Column('academic_year', sa.String(length=20), nullable=False),
        sa.Column('marks_obtained', sa.Float(), nullable=False),
        sa.Column('max_marks', sa.Float(), nullable=False, server_default='100'),
        sa.Column('percentage', sa.Float(), nullable=True),
        sa.Column('grade_name', sa.String(length=20), nullable=True),
        sa.Column('grade_point', sa.Float(), nullable=True),
        sa.Column('remarks', sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id']),
        sa.ForeignKeyConstraint(['student_id'], ['students.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['exam_id'], ['exams.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['subject_id'], ['subjects.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['class_id'], ['classes.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_grades_id'), 'grades', ['id'])
    op.create_index(op.f('ix_grades_tenant_id'), 'grades', ['tenant_id'])


def downgrade() -> None:
    op.drop_index(op.f('ix_grades_tenant_id'), table_name='grades')
    op.drop_index(op.f('ix_grades_id'), table_name='grades')
    op.drop_table('grades')
    op.drop_index(op.f('ix_grade_categories_tenant_id'), table_name='grade_categories')
    op.drop_index(op.f('ix_grade_categories_id'), table_name='grade_categories')
    op.drop_table('grade_categories')
