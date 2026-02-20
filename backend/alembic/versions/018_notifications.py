"""
018 - Notifications tables

Revision ID: 018_notifications
Revises: 017_reports
"""

revision = '018_notifications'
down_revision = '017_reports'

from alembic import op
import sqlalchemy as sa


def upgrade():
    op.create_table(
        'notifications',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('tenant_id', sa.String(50), sa.ForeignKey('tenants.id'), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('title', sa.String(300), nullable=False),
        sa.Column('message', sa.Text(), nullable=False),
        sa.Column('notification_type', sa.String(20), nullable=False, server_default='info'),
        sa.Column('priority', sa.String(10), nullable=False, server_default='medium'),
        sa.Column('channel', sa.String(10), nullable=False, server_default='in_app'),
        sa.Column('is_read', sa.Boolean(), nullable=False, server_default='0'),
        sa.Column('read_at', sa.DateTime(), nullable=True),
        sa.Column('link', sa.String(500), nullable=True),
        sa.Column('metadata_json', sa.JSON(), nullable=True),
        sa.Column('sender_id', sa.Integer(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='1'),
    )
    op.create_index('ix_notifications_user_id', 'notifications', ['user_id'])
    op.create_index('ix_notifications_tenant_id', 'notifications', ['tenant_id'])
    op.create_index('ix_notifications_is_read', 'notifications', ['is_read'])

    op.create_table(
        'notification_preferences',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('tenant_id', sa.String(50), sa.ForeignKey('tenants.id'), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, unique=True),
        sa.Column('email_enabled', sa.Boolean(), nullable=False, server_default='1'),
        sa.Column('sms_enabled', sa.Boolean(), nullable=False, server_default='0'),
        sa.Column('push_enabled', sa.Boolean(), nullable=False, server_default='1'),
        sa.Column('in_app_enabled', sa.Boolean(), nullable=False, server_default='1'),
        sa.Column('attendance_alerts', sa.Boolean(), nullable=False, server_default='1'),
        sa.Column('fee_reminders', sa.Boolean(), nullable=False, server_default='1'),
        sa.Column('exam_notifications', sa.Boolean(), nullable=False, server_default='1'),
        sa.Column('announcement_notifications', sa.Boolean(), nullable=False, server_default='1'),
        sa.Column('leave_notifications', sa.Boolean(), nullable=False, server_default='1'),
        sa.Column('report_notifications', sa.Boolean(), nullable=False, server_default='1'),
    )
    op.create_index('ix_notification_preferences_user_id', 'notification_preferences', ['user_id'])


def downgrade():
    op.drop_table('notification_preferences')
    op.drop_table('notifications')
