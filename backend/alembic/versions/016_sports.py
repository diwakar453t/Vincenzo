"""
016 - Sports Management tables

Revision ID: 016_sports
Revises: 015_transport
"""

revision = '016_sports'
down_revision = '015_transport'

from alembic import op
import sqlalchemy as sa


def upgrade():
    op.create_table(
        'sports',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('tenant_id', sa.String(50), sa.ForeignKey('tenants.id'), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column('name', sa.String(200), nullable=False),
        sa.Column('code', sa.String(20), nullable=True),
        sa.Column('category', sa.String(20), nullable=False, server_default='team'),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('coach_name', sa.String(200), nullable=True),
        sa.Column('coach_phone', sa.String(20), nullable=True),
        sa.Column('venue', sa.String(200), nullable=True),
        sa.Column('practice_schedule', sa.String(200), nullable=True),
        sa.Column('max_participants', sa.Integer(), nullable=False, server_default='30'),
        sa.Column('current_participants', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('season', sa.String(50), nullable=True),
        sa.Column('registration_fee', sa.Float(), nullable=False, server_default='0'),
        sa.Column('equipment_provided', sa.Boolean(), nullable=False, server_default='0'),
        sa.Column('status', sa.String(20), nullable=False, server_default='active'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='1'),
    )
    op.create_index('ix_sports_id', 'sports', ['id'])
    op.create_index('ix_sports_tenant_id', 'sports', ['tenant_id'])

    op.create_table(
        'sport_participations',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('tenant_id', sa.String(50), sa.ForeignKey('tenants.id'), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column('sport_id', sa.Integer(), sa.ForeignKey('sports.id', ondelete='CASCADE'), nullable=False),
        sa.Column('student_id', sa.Integer(), sa.ForeignKey('students.id', ondelete='CASCADE'), nullable=False),
        sa.Column('registration_date', sa.Date(), nullable=False),
        sa.Column('end_date', sa.Date(), nullable=True),
        sa.Column('position', sa.String(50), nullable=True),
        sa.Column('jersey_number', sa.String(10), nullable=True),
        sa.Column('fee_paid', sa.Boolean(), nullable=False, server_default='0'),
        sa.Column('status', sa.String(20), nullable=False, server_default='registered'),
        sa.Column('remarks', sa.Text(), nullable=True),
    )
    op.create_index('ix_sport_participations_id', 'sport_participations', ['id'])
    op.create_index('ix_sport_participations_tenant_id', 'sport_participations', ['tenant_id'])
    op.create_index('ix_sport_participations_sport_id', 'sport_participations', ['sport_id'])
    op.create_index('ix_sport_participations_student_id', 'sport_participations', ['student_id'])

    op.create_table(
        'sport_achievements',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('tenant_id', sa.String(50), sa.ForeignKey('tenants.id'), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column('sport_id', sa.Integer(), sa.ForeignKey('sports.id', ondelete='CASCADE'), nullable=False),
        sa.Column('student_id', sa.Integer(), sa.ForeignKey('students.id', ondelete='SET NULL'), nullable=True),
        sa.Column('title', sa.String(300), nullable=False),
        sa.Column('achievement_type', sa.String(20), nullable=False, server_default='participation'),
        sa.Column('level', sa.String(20), nullable=False, server_default='school'),
        sa.Column('event_name', sa.String(300), nullable=True),
        sa.Column('event_date', sa.Date(), nullable=True),
        sa.Column('event_venue', sa.String(200), nullable=True),
        sa.Column('description', sa.Text(), nullable=True),
    )
    op.create_index('ix_sport_achievements_id', 'sport_achievements', ['id'])
    op.create_index('ix_sport_achievements_tenant_id', 'sport_achievements', ['tenant_id'])
    op.create_index('ix_sport_achievements_sport_id', 'sport_achievements', ['sport_id'])


def downgrade():
    op.drop_table('sport_achievements')
    op.drop_table('sport_participations')
    op.drop_table('sports')
