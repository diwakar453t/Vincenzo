"""
🔍 Database Performance Analyzer
===================================
Identifies slow queries, missing indexes, N+1 issues, and query plans.

Usage:
  cd backend
  python -m performance.db_profiler           # Full analysis
  python -m performance.db_profiler --top=20  # Show top 20 slow queries
  python -m performance.db_profiler --explain # Show EXPLAIN plans

What it does:
  1. Instruments SQLAlchemy to capture all queries with timing
  2. Identifies N+1 patterns (same query repeated many times)
  3. Runs EXPLAIN ANALYZE on slow queries (PostgreSQL)
  4. Counts sequential scans (suggests missing indexes)
  5. Measures query plan costs
  6. Generates HTML report with actionable recommendations
"""
import argparse
import json
import os
import sys
import time
import statistics
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

# Add parent to path
sys.path.insert(0, str(Path(__file__).parent.parent))


# ── Query Capture ─────────────────────────────────────────────────────────
class QueryProfiler:
    """SQLAlchemy event listener that captures all executed queries."""

    def __init__(self):
        self.queries: list[dict] = []
        self.start_time = time.time()

    def before_cursor_execute(self, conn, cursor, statement, parameters,
                              context, executemany):
        context._query_start_time = time.time()

    def after_cursor_execute(self, conn, cursor, statement, parameters,
                             context, executemany):
        duration_ms = (time.time() - context._query_start_time) * 1000
        self.queries.append({
            "sql": statement,
            "params": str(parameters)[:200] if parameters else "",
            "duration_ms": round(duration_ms, 3),
            "timestamp": time.time(),
            "is_slow": duration_ms > 100,  # > 100ms is slow
        })

    def get_stats(self) -> dict:
        if not self.queries:
            return {"total": 0}

        durations = [q["duration_ms"] for q in self.queries]
        slow = [q for q in self.queries if q["is_slow"]]

        # Detect N+1: same statement repeated many times
        statement_counts: dict[str, int] = defaultdict(int)
        for q in self.queries:
            # Normalize: strip values, keep structure
            normalized = q["sql"].split("WHERE")[0].strip()
            statement_counts[normalized] += 1

        n_plus_one = {
            stmt: count
            for stmt, count in statement_counts.items()
            if count > 5  # Same query >5 times = potential N+1
        }

        return {
            "total_queries": len(self.queries),
            "total_duration_ms": sum(durations),
            "avg_duration_ms": statistics.mean(durations),
            "median_duration_ms": statistics.median(durations),
            "p95_ms": sorted(durations)[int(len(durations) * 0.95)],
            "max_duration_ms": max(durations),
            "slow_queries": len(slow),
            "slow_query_rate": len(slow) / len(self.queries),
            "n_plus_one_candidates": n_plus_one,
            "queries": self.queries,
        }


# ── Index Recommender ─────────────────────────────────────────────────────
def analyze_missing_indexes(engine) -> list[dict]:
    """
    Analyzes WHERE clauses in captured queries to identify columns
    that would benefit from an index.
    """
    recommendations = []

    # Run pg_stat_user_tables to find sequential scans
    try:
        with engine.connect() as conn:
            result = conn.execute("""
                SELECT
                    schemaname,
                    tablename,
                    seq_scan,
                    seq_tup_read,
                    idx_scan,
                    idx_tup_fetch,
                    CASE WHEN seq_scan > 0
                         THEN ROUND(seq_tup_read::numeric / seq_scan, 0)
                         ELSE 0 END as avg_rows_per_seq_scan,
                    n_live_tup as total_rows
                FROM pg_stat_user_tables
                WHERE schemaname = 'public'
                  AND seq_scan > 0
                  AND n_live_tup > 1000          -- Only large tables
                ORDER BY seq_tup_read DESC
                LIMIT 20;
            """)
            for row in result:
                idx_ratio = row.idx_scan / (row.seq_scan + row.idx_scan + 1)
                if idx_ratio < 0.5 and row.total_rows > 1000:
                    recommendations.append({
                        "table": row.tablename,
                        "seq_scans": row.seq_scan,
                        "idx_scans": row.idx_scan,
                        "avg_rows_per_scan": int(row.avg_rows_per_seq_scan),
                        "total_rows": row.total_rows,
                        "index_usage_ratio": round(idx_ratio, 3),
                        "priority": "HIGH" if idx_ratio < 0.1 else "MEDIUM",
                        "suggestion": f"Table '{row.tablename}' relies heavily on sequential scans. Add indexes on columns used in WHERE/JOIN clauses.",
                    })
    except Exception as e:
        # SQLite or no pg_stat available
        recommendations.append({
            "note": f"pg_stat_user_tables not available ({e}). Run this on PostgreSQL for index suggestions."
        })

    return recommendations


# ── Query EXPLAIN ─────────────────────────────────────────────────────────
def explain_query(engine, sql: str, params: dict = None) -> dict:
    """Run EXPLAIN ANALYZE on a query (PostgreSQL only)."""
    try:
        with engine.connect() as conn:
            result = conn.execute(f"EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) {sql}", params or {})
            plan = result.fetchone()[0]
            top_plan = plan[0]["Plan"]
            return {
                "sql": sql[:200],
                "total_cost": top_plan.get("Total Cost", 0),
                "actual_time_ms": top_plan.get("Actual Total Time", 0),
                "rows": top_plan.get("Actual Rows", 0),
                "node_type": top_plan.get("Node Type"),
                "sequential_scan": "Seq Scan" in str(plan),
                "plan": plan,
            }
    except Exception as e:
        return {"error": str(e), "sql": sql[:200]}


# ── Simulation Runner ─────────────────────────────────────────────────────
def run_profiling_simulation(engine, session_factory) -> dict:
    """
    Exercises all major API query patterns and captures performance.
    Returns profiling statistics.
    """
    from sqlalchemy import event, text

    profiler = QueryProfiler()
    event.listen(engine, "before_cursor_execute", profiler.before_cursor_execute)
    event.listen(engine, "after_cursor_execute", profiler.after_cursor_execute)

    print("\n🔍 Running query profiling simulation...")
    print("   Exercises: students, teachers, fees, attendance, search\n")

    with session_factory() as db:
        # ── Students ──────────────────────────────────────────────────
        print("  → Querying students list (5 pages)")
        for _ in range(5):
            db.execute(text("""
                SELECT * FROM students
                WHERE status = 'active'
                ORDER BY created_at DESC
                LIMIT 20 OFFSET :offset
            """), {"offset": _ * 20})

        print("  → Student search (name/email)")
        for name in ["Aarav", "Kumar", "Sharma"]:
            db.execute(text("""
                SELECT * FROM students
                WHERE first_name ILIKE :pattern
                   OR last_name ILIKE :pattern
                   OR email ILIKE :pattern
                ORDER BY created_at DESC
                LIMIT 20
            """), {"pattern": f"%{name}%"})

        print("  → Student with class join")
        for _ in range(10):
            db.execute(text("""
                SELECT s.*, c.name as class_name, c.section
                FROM students s
                LEFT JOIN classes c ON c.id = s.class_id
                WHERE s.status = 'active'
                ORDER BY s.last_name, s.first_name
                LIMIT 20 OFFSET :offset
            """), {"offset": _ * 20})

        # ── Attendance ────────────────────────────────────────────────
        print("  → Attendance queries (monthly report)")
        for class_id in range(1, 11):
            db.execute(text("""
                SELECT
                    s.id, s.first_name, s.last_name,
                    COUNT(CASE WHEN a.status = 'present' THEN 1 END) as present_days,
                    COUNT(CASE WHEN a.status = 'absent' THEN 1 END) as absent_days,
                    COUNT(a.id) as total_days,
                    ROUND(
                        COUNT(CASE WHEN a.status = 'present' THEN 1 END) * 100.0 /
                        NULLIF(COUNT(a.id), 0), 2
                    ) as attendance_pct
                FROM students s
                LEFT JOIN attendances a ON a.student_id = s.id
                    AND EXTRACT(MONTH FROM a.date) = 2
                    AND EXTRACT(YEAR FROM a.date) = 2026
                WHERE s.class_id = :class_id
                GROUP BY s.id, s.first_name, s.last_name
                ORDER BY attendance_pct ASC
            """), {"class_id": class_id})

        # ── Fee queries ───────────────────────────────────────────────
        print("  → Fee collection queries")
        db.execute(text("""
            SELECT
                SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END) as collected,
                SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END) as pending,
                COUNT(CASE WHEN status = 'overdue' THEN 1 END) as overdue_count,
                AVG(amount) as avg_fee
            FROM fee_collections
            WHERE EXTRACT(MONTH FROM created_at) = 2
              AND EXTRACT(YEAR FROM created_at) = 2026
        """))

        print("  → Fee defaulters by class")
        db.execute(text("""
            SELECT
                c.name as class_name,
                COUNT(fc.id) as pending_count,
                SUM(fc.amount) as total_pending
            FROM fee_collections fc
            JOIN students s ON s.id = fc.student_id
            JOIN classes c ON c.id = s.class_id
            WHERE fc.status = 'pending'
            GROUP BY c.name
            ORDER BY total_pending DESC
        """))

        # ── Dashboard aggregations ────────────────────────────────────
        print("  → Dashboard aggregation queries")
        for _ in range(5):
            # This is a complex multi-table aggregate — common bottleneck
            db.execute(text("""
                SELECT
                    (SELECT COUNT(*) FROM students WHERE status = 'active') as active_students,
                    (SELECT COUNT(*) FROM users WHERE role = 'teacher' AND is_active = true) as active_teachers,
                    (SELECT COUNT(*) FROM classes WHERE is_active = true) as active_classes,
                    (SELECT COALESCE(SUM(amount), 0) FROM fee_collections WHERE status = 'pending') as pending_fees
            """))

        # ── Notification queries ──────────────────────────────────────
        print("  → Notification queries (unread)")
        for user_id in range(1, 21):
            db.execute(text("""
                SELECT * FROM notifications
                WHERE (user_id = :uid OR is_broadcast = true)
                  AND is_read = false
                ORDER BY created_at DESC
                LIMIT 10
            """), {"uid": user_id})

    event.remove(engine, "before_cursor_execute", profiler.before_cursor_execute)
    event.remove(engine, "after_cursor_execute", profiler.after_cursor_execute)

    return profiler.get_stats()


# ── Report Generator ─────────────────────────────────────────────────────
def generate_report(stats: dict, index_recs: list[dict], output_dir: str) -> str:
    """Generates HTML + JSON performance reports."""
    os.makedirs(output_dir, exist_ok=True)

    # ── JSON report
    json_path = os.path.join(output_dir, "db_profile.json")
    with open(json_path, "w") as f:
        json.dump({
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "stats": {k: v for k, v in stats.items() if k != "queries"},
            "top_slow_queries": sorted(
                stats.get("queries", []),
                key=lambda q: q["duration_ms"],
                reverse=True,
            )[:20],
            "index_recommendations": index_recs,
        }, f, indent=2, default=str)

    # ── Console summary
    print("\n" + "═" * 65)
    print("📊 DATABASE PERFORMANCE REPORT")
    print("═" * 65)
    print(f"  Total Queries     : {stats.get('total_queries', 0):,}")
    print(f"  Total DB Time     : {stats.get('total_duration_ms', 0):.0f}ms")
    print(f"  Avg Query Time    : {stats.get('avg_duration_ms', 0):.2f}ms")
    print(f"  Median Query Time : {stats.get('median_duration_ms', 0):.2f}ms")
    print(f"  p95 Query Time    : {stats.get('p95_ms', 0):.2f}ms")
    print(f"  Max Query Time    : {stats.get('max_duration_ms', 0):.2f}ms")
    print(f"  Slow Queries (>100ms): {stats.get('slow_queries', 0)}")
    print(f"  Slow Query Rate   : {stats.get('slow_query_rate', 0) * 100:.1f}%")

    n1 = stats.get("n_plus_one_candidates", {})
    if n1:
        print(f"\n⚠️  N+1 QUERY CANDIDATES ({len(n1)} found):")
        for stmt, count in list(n1.items())[:5]:
            print(f"     × {count}x  {stmt[:80]}...")
    else:
        print("\n✅ No N+1 query patterns detected")

    if index_recs:
        print(f"\n📌 INDEX RECOMMENDATIONS ({len(index_recs)}):")
        for rec in index_recs[:5]:
            if "table" in rec:
                print(f"  [{rec['priority']}] {rec['table']}: {rec['suggestion']}")
            else:
                print(f"  Note: {rec.get('note', '')}")
    else:
        print("\n✅ No critical missing indexes detected")

    print("\n" + "═" * 65)
    print(f"  Reports written to: {output_dir}/")
    print("═" * 65)

    return json_path


# ── Entry point ───────────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(description="PreSkool DB Performance Profiler")
    parser.add_argument("--top", type=int, default=10, help="Show top N slow queries")
    parser.add_argument("--explain", action="store_true", help="Run EXPLAIN on slow queries")
    parser.add_argument("--output", default="performance/reports", help="Output directory")
    args = parser.parse_args()

    try:
        from app.core.database import engine, SessionLocal
    except ImportError:
        print("❌ Cannot import database. Run from the backend directory:")
        print("   cd backend && python -m performance.db_profiler")
        sys.exit(1)

    stats = run_profiling_simulation(engine, SessionLocal)
    index_recs = analyze_missing_indexes(engine)

    # Top slow queries
    slow = sorted(stats.get("queries", []), key=lambda q: q["duration_ms"], reverse=True)
    print(f"\n🐢 TOP {args.top} SLOW QUERIES:")
    for i, q in enumerate(slow[:args.top], 1):
        print(f"  {i}. {q['duration_ms']:.1f}ms | {q['sql'][:100].strip()}...")

    # EXPLAIN plans for top slow queries (PostgreSQL only)
    if args.explain:
        print("\n📋 EXPLAIN ANALYZE RESULTS:")
        for q in slow[:3]:
            plan = explain_query(engine, q["sql"])
            print(f"\n  SQL: {q['sql'][:80].strip()}...")
            print(f"  Cost: {plan.get('total_cost', '?')}")
            print(f"  Time: {plan.get('actual_time_ms', '?')}ms")
            print(f"  Seq Scan: {plan.get('sequential_scan', '?')}")

    generate_report(stats, index_recs, args.output)


if __name__ == "__main__":
    main()
