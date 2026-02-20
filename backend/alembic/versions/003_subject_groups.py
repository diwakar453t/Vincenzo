"""Add subject_groups table and enhance subjects

Revision ID: 003_subject_groups
Revises: 002_admin_models
Create Date: 2026-02-18

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '003_subject_groups'
down_revision: Union[str, None] = '002_admin_models'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create subject_groups table
    op.create_table(
        'subject_groups',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('tenant_id', sa.String(length=50), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id']),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_subject_groups_id'), 'subject_groups', ['id'])
    op.create_index(op.f('ix_subject_groups_tenant_id'), 'subject_groups', ['tenant_id'])

    # Add new columns to subjects table (SQLite-friendly: no ALTER FK)
    op.add_column('subjects', sa.Column('subject_type', sa.String(length=30), nullable=False, server_default='theory'))
    op.add_column('subjects', sa.Column('group_id', sa.Integer(), nullable=True))
    # FK relationship is managed by SQLAlchemy ORM; SQLite FK pragma is enabled in database.py


def downgrade() -> None:
    # Remove columns from subjects (SQLite batch mode for column drops)
    with op.batch_alter_table('subjects') as batch_op:
        batch_op.drop_column('group_id')
        batch_op.drop_column('subject_type')

    # Drop subject_groups table
    op.drop_index(op.f('ix_subject_groups_tenant_id'), table_name='subject_groups')
    op.drop_index(op.f('ix_subject_groups_id'), table_name='subject_groups')
    op.drop_table('subject_groups')
