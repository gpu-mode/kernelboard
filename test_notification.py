#!/usr/bin/env python3
"""Temporarily fake a snapshot row to test Discord webhook notifications."""
import psycopg2
import os
import sys

conn = psycopg2.connect(os.environ["DATABASE_URL"])
cur = conn.cursor()

if "--restore" in sys.argv:
    # Just re-run the worker with --test to restore real data
    print("Run: python3 ranking_worker.py --test")
else:
    cur.execute("""
        UPDATE leaderboard.ranking_snapshot
        SET user_id = 'fake_user_123', user_name = 'FakeUser'
        WHERE (leaderboard_id, gpu_type, rank) = (
            SELECT leaderboard_id, gpu_type, rank
            FROM leaderboard.ranking_snapshot
            WHERE rank = 1
            LIMIT 1
        )
    """)
    conn.commit()
    print(f"Updated {cur.rowcount} row(s) to fake user")
    print("Now run: python3 ranking_worker.py --test")

conn.close()
