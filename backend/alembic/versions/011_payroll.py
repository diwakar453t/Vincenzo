"""Add payroll tables

Revision ID: 011_payroll
Revises: 010_leaves
Create Date: 2026-02-18
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '011_payroll'
down_revision: Union[str, None] = '010_leaves'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('payroll_components',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('tenant_id', sa.String(50), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('code', sa.String(20), nullable=True),
        sa.Column('component_type', sa.Enum('earning', 'deduction', name='componenttype'), nullable=False),
        sa.Column('is_percentage', sa.Boolean(), nullable=False, server_default='0'),
        sa.Column('percentage_of', sa.String(50), nullable=True),
        sa.Column('default_amount', sa.Float(), nullable=False, server_default='0'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='1'),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('sort_order', sa.Integer(), nullable=False, server_default='0'),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_payroll_components_id', 'payroll_components', ['id'])
    op.create_index('ix_payroll_components_tenant_id', 'payroll_components', ['tenant_id'])

    op.create_table('salary_structures',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('tenant_id', sa.String(50), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('teacher_id', sa.Integer(), nullable=False),
        sa.Column('gross_salary', sa.Float(), nullable=False, server_default='0'),
        sa.Column('net_salary', sa.Float(), nullable=False, server_default='0'),
        sa.Column('effective_from', sa.Date(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='1'),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id']),
        sa.ForeignKeyConstraint(['teacher_id'], ['teachers.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('teacher_id'),
    )
    op.create_index('ix_salary_structures_id', 'salary_structures', ['id'])
    op.create_index('ix_salary_structures_tenant_id', 'salary_structures', ['tenant_id'])

    op.create_table('salary_structure_items',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('tenant_id', sa.String(50), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('structure_id', sa.Integer(), nullable=False),
        sa.Column('component_id', sa.Integer(), nullable=False),
        sa.Column('amount', sa.Float(), nullable=False, server_default='0'),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id']),
        sa.ForeignKeyConstraint(['structure_id'], ['salary_structures.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['component_id'], ['payroll_components.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_salary_structure_items_id', 'salary_structure_items', ['id'])

    op.create_table('payrolls',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('tenant_id', sa.String(50), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('teacher_id', sa.Integer(), nullable=False),
        sa.Column('month', sa.Integer(), nullable=False),
        sa.Column('year', sa.Integer(), nullable=False),
        sa.Column('working_days', sa.Integer(), nullable=False, server_default='30'),
        sa.Column('present_days', sa.Float(), nullable=False, server_default='30'),
        sa.Column('gross_salary', sa.Float(), nullable=False, server_default='0'),
        sa.Column('total_earnings', sa.Float(), nullable=False, server_default='0'),
        sa.Column('total_deductions', sa.Float(), nullable=False, server_default='0'),
        sa.Column('net_salary', sa.Float(), nullable=False, server_default='0'),
        sa.Column('status', sa.Enum('draft', 'processed', 'approved', 'paid', name='payrollstatus'), nullable=False, server_default='draft'),
        sa.Column('remarks', sa.Text(), nullable=True),
        sa.Column('paid_date', sa.Date(), nullable=True),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id']),
        sa.ForeignKeyConstraint(['teacher_id'], ['teachers.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_payrolls_id', 'payrolls', ['id'])
    op.create_index('ix_payrolls_tenant_id', 'payrolls', ['tenant_id'])
    op.create_index('ix_payrolls_month_year', 'payrolls', ['month', 'year'])

    op.create_table('payroll_items',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('tenant_id', sa.String(50), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('payroll_id', sa.Integer(), nullable=False),
        sa.Column('component_id', sa.Integer(), nullable=False),
        sa.Column('component_name', sa.String(100), nullable=False),
        sa.Column('component_type', sa.Enum('earning', 'deduction', name='componenttype'), nullable=False),
        sa.Column('amount', sa.Float(), nullable=False, server_default='0'),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id']),
        sa.ForeignKeyConstraint(['payroll_id'], ['payrolls.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['component_id'], ['payroll_components.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_payroll_items_id', 'payroll_items', ['id'])


def downgrade() -> None:
    op.drop_table('payroll_items')
    op.drop_table('payrolls')
    op.drop_table('salary_structure_items')
    op.drop_table('salary_structures')
    op.drop_table('payroll_components')
