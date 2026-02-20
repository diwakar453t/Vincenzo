"""Add syllabi and syllabus_topics tables

Revision ID: 004_syllabus
Revises: 003_subject_groups
Create Date: 2026-02-18

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '004_syllabus'
down_revision: Union[str, None] = '003_subject_groups'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create syllabi table
    op.create_table(
        'syllabi',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('tenant_id', sa.String(length=50), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('title', sa.String(length=200), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('academic_year', sa.String(length=20), nullable=False),
        sa.Column('status', sa.String(length=20), nullable=False, server_default='draft'),
        sa.Column('subject_id', sa.Integer(), nullable=False),
        sa.Column('class_id', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id']),
        sa.ForeignKeyConstraint(['subject_id'], ['subjects.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['class_id'], ['classes.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_syllabi_id'), 'syllabi', ['id'])
    op.create_index(op.f('ix_syllabi_tenant_id'), 'syllabi', ['tenant_id'])

    # Create syllabus_topics table
    op.create_table(
        'syllabus_topics',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('tenant_id', sa.String(length=50), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('title', sa.String(length=200), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('order', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('is_completed', sa.Boolean(), nullable=False, server_default=sa.text('0')),
        sa.Column('completed_date', sa.Date(), nullable=True),
        sa.Column('document_path', sa.String(length=500), nullable=True),
        sa.Column('document_name', sa.String(length=200), nullable=True),
        sa.Column('syllabus_id', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id']),
        sa.ForeignKeyConstraint(['syllabus_id'], ['syllabi.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_syllabus_topics_id'), 'syllabus_topics', ['id'])
    op.create_index(op.f('ix_syllabus_topics_tenant_id'), 'syllabus_topics', ['tenant_id'])


def downgrade() -> None:
    op.drop_index(op.f('ix_syllabus_topics_tenant_id'), table_name='syllabus_topics')
    op.drop_index(op.f('ix_syllabus_topics_id'), table_name='syllabus_topics')
    op.drop_table('syllabus_topics')

    op.drop_index(op.f('ix_syllabi_tenant_id'), table_name='syllabi')
    op.drop_index(op.f('ix_syllabi_id'), table_name='syllabi')
    op.drop_table('syllabi')
