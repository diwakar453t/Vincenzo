"""
022 - Plugin records table

Revision ID: 022_plugins
Revises: 021_payments
"""
revision = '022_plugins'
down_revision = '021_payments'

from alembic import op
import sqlalchemy as sa


def upgrade():
    op.create_table(
        'plugin_records',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('tenant_id', sa.String(50), sa.ForeignKey('tenants.id'), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column('name', sa.String(100), nullable=False, unique=True),
        sa.Column('version', sa.String(20), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('author', sa.String(100), nullable=True),
        sa.Column('category', sa.String(50), server_default='general'),
        sa.Column('icon', sa.String(10), server_default='🔌'),
        sa.Column('status', sa.String(20), nullable=False, server_default='installed'),
        sa.Column('config', sa.JSON(), nullable=True),
        sa.Column('is_builtin', sa.Boolean(), nullable=False, server_default='0'),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='1'),
    )
    op.create_index('ix_plugin_records_name', 'plugin_records', ['name'])


def downgrade():
    op.drop_table('plugin_records')
