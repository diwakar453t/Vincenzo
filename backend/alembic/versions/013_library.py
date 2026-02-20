"""
013 - Library Management tables

Revision ID: 013_library
Revises: 012_fees
"""

revision = '013_library'
down_revision = '012_fees'

from alembic import op
import sqlalchemy as sa


def upgrade():
    # Books
    op.create_table(
        'books',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('tenant_id', sa.String(50), sa.ForeignKey('tenants.id'), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column('title', sa.String(255), nullable=False),
        sa.Column('isbn', sa.String(20), nullable=True),
        sa.Column('author', sa.String(200), nullable=False),
        sa.Column('publisher', sa.String(200), nullable=True),
        sa.Column('edition', sa.String(50), nullable=True),
        sa.Column('category', sa.String(100), nullable=True),
        sa.Column('subject', sa.String(100), nullable=True),
        sa.Column('language', sa.String(50), nullable=True, server_default='English'),
        sa.Column('pages', sa.Integer(), nullable=True),
        sa.Column('price', sa.Float(), nullable=True, server_default='0'),
        sa.Column('rack_number', sa.String(20), nullable=True),
        sa.Column('total_copies', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('available_copies', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('cover_image', sa.String(500), nullable=True),
        sa.Column('publication_year', sa.Integer(), nullable=True),
        sa.Column('status', sa.String(20), nullable=False, server_default='available'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='1'),
    )
    op.create_index('ix_books_id', 'books', ['id'])
    op.create_index('ix_books_tenant_id', 'books', ['tenant_id'])
    op.create_index('ix_books_isbn', 'books', ['isbn'])
    op.create_index('ix_books_title', 'books', ['title'])
    op.create_index('ix_books_category', 'books', ['category'])

    # Library Members
    op.create_table(
        'library_members',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('tenant_id', sa.String(50), sa.ForeignKey('tenants.id'), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column('member_code', sa.String(30), nullable=True),
        sa.Column('member_type', sa.String(20), nullable=False, server_default='student'),
        sa.Column('student_id', sa.Integer(), sa.ForeignKey('students.id', ondelete='SET NULL'), nullable=True),
        sa.Column('teacher_id', sa.Integer(), sa.ForeignKey('teachers.id', ondelete='SET NULL'), nullable=True),
        sa.Column('name', sa.String(200), nullable=False),
        sa.Column('email', sa.String(200), nullable=True),
        sa.Column('phone', sa.String(20), nullable=True),
        sa.Column('max_books_allowed', sa.Integer(), nullable=False, server_default='3'),
        sa.Column('membership_start', sa.Date(), nullable=True),
        sa.Column('membership_end', sa.Date(), nullable=True),
        sa.Column('status', sa.String(20), nullable=False, server_default='active'),
        sa.Column('books_issued', sa.Integer(), nullable=False, server_default='0'),
    )
    op.create_index('ix_library_members_id', 'library_members', ['id'])
    op.create_index('ix_library_members_tenant_id', 'library_members', ['tenant_id'])
    op.create_index('ix_library_members_member_code', 'library_members', ['member_code'])

    # Issue/Return
    op.create_table(
        'issue_returns',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('tenant_id', sa.String(50), sa.ForeignKey('tenants.id'), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column('book_id', sa.Integer(), sa.ForeignKey('books.id', ondelete='CASCADE'), nullable=False),
        sa.Column('member_id', sa.Integer(), sa.ForeignKey('library_members.id', ondelete='CASCADE'), nullable=False),
        sa.Column('issue_date', sa.Date(), nullable=False),
        sa.Column('due_date', sa.Date(), nullable=False),
        sa.Column('return_date', sa.Date(), nullable=True),
        sa.Column('status', sa.String(20), nullable=False, server_default='issued'),
        sa.Column('fine_amount', sa.Float(), nullable=False, server_default='0'),
        sa.Column('fine_paid', sa.Boolean(), nullable=False, server_default='0'),
        sa.Column('fine_per_day', sa.Float(), nullable=False, server_default='2'),
        sa.Column('remarks', sa.Text(), nullable=True),
    )
    op.create_index('ix_issue_returns_id', 'issue_returns', ['id'])
    op.create_index('ix_issue_returns_tenant_id', 'issue_returns', ['tenant_id'])
    op.create_index('ix_issue_returns_book_id', 'issue_returns', ['book_id'])
    op.create_index('ix_issue_returns_member_id', 'issue_returns', ['member_id'])
    op.create_index('ix_issue_returns_status', 'issue_returns', ['status'])
    op.create_index('ix_issue_returns_due_date', 'issue_returns', ['due_date'])


def downgrade():
    op.drop_table('issue_returns')
    op.drop_table('library_members')
    op.drop_table('books')
