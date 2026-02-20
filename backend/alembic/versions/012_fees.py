"""Add fees tables

Revision ID: 012_fees
Revises: 011_payroll
Create Date: 2026-02-18
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '012_fees'
down_revision: Union[str, None] = '011_payroll'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('fee_groups',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('tenant_id', sa.String(50), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('code', sa.String(20), nullable=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='1'),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_fee_groups_id', 'fee_groups', ['id'])
    op.create_index('ix_fee_groups_tenant_id', 'fee_groups', ['tenant_id'])

    op.create_table('fee_types',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('tenant_id', sa.String(50), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('fee_group_id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('code', sa.String(20), nullable=True),
        sa.Column('amount', sa.Float(), nullable=False, server_default='0'),
        sa.Column('due_date', sa.Date(), nullable=True),
        sa.Column('is_recurring', sa.Boolean(), nullable=False, server_default='0'),
        sa.Column('frequency', sa.String(20), nullable=True),
        sa.Column('academic_year', sa.String(20), nullable=False, server_default="'2025-26'"),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='1'),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('class_id', sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id']),
        sa.ForeignKeyConstraint(['fee_group_id'], ['fee_groups.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['class_id'], ['classes.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_fee_types_id', 'fee_types', ['id'])
    op.create_index('ix_fee_types_tenant_id', 'fee_types', ['tenant_id'])

    op.create_table('student_fee_assignments',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('tenant_id', sa.String(50), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('student_id', sa.Integer(), nullable=False),
        sa.Column('fee_type_id', sa.Integer(), nullable=False),
        sa.Column('amount', sa.Float(), nullable=False, server_default='0'),
        sa.Column('discount', sa.Float(), nullable=False, server_default='0'),
        sa.Column('net_amount', sa.Float(), nullable=False, server_default='0'),
        sa.Column('paid_amount', sa.Float(), nullable=False, server_default='0'),
        sa.Column('balance', sa.Float(), nullable=False, server_default='0'),
        sa.Column('status', sa.Enum('paid', 'partial', 'unpaid', 'overdue', name='paymentstatus'), nullable=False, server_default='unpaid'),
        sa.Column('due_date', sa.Date(), nullable=True),
        sa.Column('academic_year', sa.String(20), nullable=False, server_default="'2025-26'"),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id']),
        sa.ForeignKeyConstraint(['student_id'], ['students.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['fee_type_id'], ['fee_types.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_student_fee_assignments_id', 'student_fee_assignments', ['id'])
    op.create_index('ix_student_fee_assignments_student_id', 'student_fee_assignments', ['student_id'])
    op.create_index('ix_student_fee_assignments_status', 'student_fee_assignments', ['status'])

    op.create_table('fee_collections',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('tenant_id', sa.String(50), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('student_id', sa.Integer(), nullable=False),
        sa.Column('fee_type_id', sa.Integer(), nullable=False),
        sa.Column('assignment_id', sa.Integer(), nullable=True),
        sa.Column('receipt_number', sa.String(50), nullable=True),
        sa.Column('amount', sa.Float(), nullable=False),
        sa.Column('payment_method', sa.Enum('cash', 'cheque', 'online', 'upi', 'bank_transfer', 'card', name='paymentmethod'), nullable=False, server_default='cash'),
        sa.Column('payment_date', sa.Date(), nullable=False),
        sa.Column('transaction_id', sa.String(100), nullable=True),
        sa.Column('remarks', sa.Text(), nullable=True),
        sa.Column('academic_year', sa.String(20), nullable=False, server_default="'2025-26'"),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id']),
        sa.ForeignKeyConstraint(['student_id'], ['students.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['fee_type_id'], ['fee_types.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['assignment_id'], ['student_fee_assignments.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_fee_collections_id', 'fee_collections', ['id'])
    op.create_index('ix_fee_collections_student_id', 'fee_collections', ['student_id'])
    op.create_index('ix_fee_collections_payment_date', 'fee_collections', ['payment_date'])


def downgrade() -> None:
    op.drop_table('fee_collections')
    op.drop_table('student_fee_assignments')
    op.drop_table('fee_types')
    op.drop_table('fee_groups')
