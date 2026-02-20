"""
021 - Payment transactions table

Revision ID: 021_payments
Revises: 020_settings
"""

revision = '021_payments'
down_revision = '020_settings'

from alembic import op
import sqlalchemy as sa


def upgrade():
    op.create_table(
        'payment_transactions',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('tenant_id', sa.String(50), sa.ForeignKey('tenants.id'), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),

        # Gateway
        sa.Column('order_id', sa.String(100), nullable=True, unique=True),
        sa.Column('payment_id', sa.String(100), nullable=True, unique=True),
        sa.Column('gateway_signature', sa.String(300), nullable=True),

        # Transaction
        sa.Column('amount', sa.Float(), nullable=False),
        sa.Column('currency', sa.String(10), nullable=False, server_default='INR'),
        sa.Column('status', sa.String(30), nullable=False, server_default='initiated'),
        sa.Column('payment_method', sa.String(20), nullable=False, server_default='upi'),
        sa.Column('purpose', sa.String(30), nullable=False, server_default='tuition_fee'),
        sa.Column('description', sa.Text(), nullable=True),

        # UPI
        sa.Column('upi_id', sa.String(100), nullable=True),
        sa.Column('upi_transaction_id', sa.String(100), nullable=True),

        # Payer
        sa.Column('payer_user_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('student_id', sa.Integer(), sa.ForeignKey('students.id', ondelete='SET NULL'), nullable=True),
        sa.Column('payer_name', sa.String(200), nullable=True),
        sa.Column('payer_email', sa.String(255), nullable=True),
        sa.Column('payer_phone', sa.String(20), nullable=True),

        # Fee linkage
        sa.Column('fee_assignment_id', sa.Integer(), nullable=True),

        # Receipt
        sa.Column('receipt_number', sa.String(50), nullable=True, unique=True),
        sa.Column('receipt_generated', sa.Boolean(), nullable=False, server_default='0'),
        sa.Column('receipt_url', sa.String(500), nullable=True),

        # Refund
        sa.Column('refund_id', sa.String(100), nullable=True),
        sa.Column('refund_amount', sa.Float(), nullable=True),
        sa.Column('refund_reason', sa.Text(), nullable=True),
        sa.Column('refund_status', sa.String(30), nullable=True),
        sa.Column('refunded_at', sa.DateTime(), nullable=True),

        # Gateway response
        sa.Column('gateway_response', sa.JSON(), nullable=True),
        sa.Column('error_code', sa.String(50), nullable=True),
        sa.Column('error_description', sa.Text(), nullable=True),

        # Timestamps
        sa.Column('paid_at', sa.DateTime(), nullable=True),
        sa.Column('verified_at', sa.DateTime(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='1'),
    )
    op.create_index('ix_payment_transactions_tenant', 'payment_transactions', ['tenant_id'])
    op.create_index('ix_payment_transactions_status', 'payment_transactions', ['status'])
    op.create_index('ix_payment_transactions_student', 'payment_transactions', ['student_id'])
    op.create_index('ix_payment_transactions_payer', 'payment_transactions', ['payer_user_id'])


def downgrade():
    op.drop_table('payment_transactions')
