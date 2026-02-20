"""
020 - Settings & Configuration tables

Revision ID: 020_settings
Revises: 019_files
"""

revision = '020_settings'
down_revision = '019_files'

from alembic import op
import sqlalchemy as sa


def upgrade():
    op.create_table(
        'school_settings',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('tenant_id', sa.String(50), sa.ForeignKey('tenants.id'), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column('school_name', sa.String(300), nullable=False, server_default='PreSkool'),
        sa.Column('school_code', sa.String(50), nullable=True),
        sa.Column('school_logo', sa.String(500), nullable=True),
        sa.Column('tagline', sa.String(300), nullable=True),
        sa.Column('address', sa.Text(), nullable=True),
        sa.Column('city', sa.String(100), nullable=True),
        sa.Column('state', sa.String(100), nullable=True),
        sa.Column('country', sa.String(100), nullable=True, server_default='India'),
        sa.Column('pincode', sa.String(20), nullable=True),
        sa.Column('phone', sa.String(20), nullable=True),
        sa.Column('email', sa.String(255), nullable=True),
        sa.Column('website', sa.String(300), nullable=True),
        sa.Column('established_year', sa.Integer(), nullable=True),
        sa.Column('principal_name', sa.String(200), nullable=True),
        sa.Column('board_affiliation', sa.String(100), nullable=True),
        sa.Column('school_type', sa.String(50), nullable=True),
    )
    op.create_index('ix_school_settings_tenant', 'school_settings', ['tenant_id'])

    op.create_table(
        'academic_years',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('tenant_id', sa.String(50), sa.ForeignKey('tenants.id'), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column('name', sa.String(50), nullable=False),
        sa.Column('start_date', sa.DateTime(), nullable=False),
        sa.Column('end_date', sa.DateTime(), nullable=False),
        sa.Column('is_current', sa.Boolean(), nullable=False, server_default='0'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='1'),
    )
    op.create_index('ix_academic_years_tenant', 'academic_years', ['tenant_id'])

    op.create_table(
        'system_preferences',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('tenant_id', sa.String(50), sa.ForeignKey('tenants.id'), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column('key', sa.String(100), nullable=False),
        sa.Column('value', sa.Text(), nullable=True),
        sa.Column('category', sa.String(20), nullable=False, server_default='system'),
        sa.Column('description', sa.String(300), nullable=True),
        sa.Column('value_type', sa.String(20), server_default='string'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='1'),
    )
    op.create_index('ix_system_preferences_tenant', 'system_preferences', ['tenant_id'])
    op.create_index('ix_system_preferences_key', 'system_preferences', ['key'])


def downgrade():
    op.drop_table('system_preferences')
    op.drop_table('academic_years')
    op.drop_table('school_settings')
