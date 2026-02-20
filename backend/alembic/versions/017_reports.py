"""
017 - Reports table

Revision ID: 017_reports
Revises: 016_sports
"""

revision = '017_reports'
down_revision = '016_sports'

from alembic import op
import sqlalchemy as sa


def upgrade():
    op.create_table(
        'reports',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('tenant_id', sa.String(50), sa.ForeignKey('tenants.id'), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column('title', sa.String(300), nullable=False),
        sa.Column('report_type', sa.String(30), nullable=False),
        sa.Column('format', sa.String(10), nullable=False, server_default='json'),
        sa.Column('status', sa.String(20), nullable=False, server_default='generated'),
        sa.Column('parameters', sa.JSON(), nullable=True),
        sa.Column('summary', sa.Text(), nullable=True),
        sa.Column('record_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('generated_by', sa.Integer(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='1'),
    )
    op.create_index('ix_reports_id', 'reports', ['id'])
    op.create_index('ix_reports_tenant_id', 'reports', ['tenant_id'])
    op.create_index('ix_reports_report_type', 'reports', ['report_type'])


def downgrade():
    op.drop_table('reports')
