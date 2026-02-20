"""
019 - File Upload tables

Revision ID: 019_files
Revises: 018_notifications
"""

revision = '019_files'
down_revision = '018_notifications'

from alembic import op
import sqlalchemy as sa


def upgrade():
    op.create_table(
        'uploaded_files',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('tenant_id', sa.String(50), sa.ForeignKey('tenants.id'), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column('filename', sa.String(500), nullable=False),
        sa.Column('original_name', sa.String(500), nullable=False),
        sa.Column('file_path', sa.String(1000), nullable=False),
        sa.Column('mime_type', sa.String(100), nullable=True),
        sa.Column('file_size', sa.Float(), nullable=False, server_default='0'),
        sa.Column('category', sa.String(20), nullable=False, server_default='other'),
        sa.Column('visibility', sa.String(10), nullable=False, server_default='private'),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('uploaded_by', sa.Integer(), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('entity_type', sa.String(50), nullable=True),
        sa.Column('entity_id', sa.Integer(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='1'),
    )
    op.create_index('ix_uploaded_files_tenant', 'uploaded_files', ['tenant_id'])
    op.create_index('ix_uploaded_files_entity', 'uploaded_files', ['entity_type', 'entity_id'])

    op.create_table(
        'file_shares',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('tenant_id', sa.String(50), sa.ForeignKey('tenants.id'), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column('file_id', sa.Integer(), sa.ForeignKey('uploaded_files.id', ondelete='CASCADE'), nullable=False),
        sa.Column('shared_with_user_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('can_edit', sa.Boolean(), nullable=False, server_default='0'),
        sa.Column('shared_by', sa.Integer(), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='1'),
    )
    op.create_index('ix_file_shares_file_id', 'file_shares', ['file_id'])
    op.create_index('ix_file_shares_user', 'file_shares', ['shared_with_user_id'])


def downgrade():
    op.drop_table('file_shares')
    op.drop_table('uploaded_files')
