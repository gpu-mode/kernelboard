#!/usr/bin/env python3
"""
Discord ranking notification worker.

Polls the database every 5 minutes, detects changes in top 3 rankings
for active leaderboards, and sends Discord webhook notifications to
congratulate people who move up and trash-talk people who get bumped.

Standalone script -- no Flask dependency. Only needs:
  - DATABASE_URL (env var)
  - DISCORD_RANKING_WEBHOOK_URL (env var)
  - psycopg2-binary (already in requirements.txt)
  - requests (already in requirements.txt)
"""

import argparse
import os
import sys
import time
import random
import logging
import psycopg2
import requests
from datetime import datetime, timezone

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("ranking_worker")

POLL_INTERVAL = 300  # 5 minutes

CONGRATS_TEMPLATES = [
    "{mention} just claimed **#{rank}** on **{leaderboard}** ({gpu}) with {score}! Absolutely cracked.",
    "New challenger at **#{rank}** on **{leaderboard}** ({gpu}): {mention} drops a {score}. Respect.",
    "{mention} slides into **#{rank}** on **{leaderboard}** ({gpu}) ({score}). The competition just got real.",
]

TRASH_TALK_TEMPLATES = [
    "{mention} got bounced from the top 3 on **{leaderboard}**. Skill issue? Probably.",
    "RIP {mention}'s top 3 spot on **{leaderboard}**. Might want to rethink that kernel.",
    "{mention} just got evicted from **{leaderboard}** top 3. Back to the drawing board.",
]

DETHRONE_TEMPLATES = [
    "{new_mention} just dethroned {old_mention} for **#1** on **{leaderboard}** ({gpu}) with {score}! The crown has a new owner.",
    "{new_mention} snatches **#1** from {old_mention} on **{leaderboard}** ({gpu}) with {score}. Long live the new king.",
    "It's over for {old_mention} — {new_mention} takes **#1** on **{leaderboard}** ({gpu}) with {score}.",
]


def format_score(score):
    """Format score as microseconds with 3 decimal places (matches kernelboard/lib/score.py)."""
    return f"{float(score) * 1_000_000:.3f}\u03bcs"


def mention(user_id):
    """Format a Discord mention from a user_info.id value."""
    return f"<@{user_id}>"


def get_connection():
    """Create a fresh DB connection."""
    url = os.environ["DATABASE_URL"]
    return psycopg2.connect(url)


def ensure_snapshot_table(conn):
    """Create ranking_snapshot if it doesn't exist (idempotent)."""
    with conn.cursor() as cur:
        cur.execute("""
            CREATE TABLE IF NOT EXISTS leaderboard.ranking_snapshot (
                leaderboard_id  INTEGER NOT NULL,
                gpu_type        TEXT NOT NULL,
                rank            INTEGER NOT NULL,
                user_id         TEXT NOT NULL,
                user_name       TEXT,
                score           NUMERIC NOT NULL,
                snapshot_time   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                PRIMARY KEY (leaderboard_id, gpu_type, rank)
            );
        """)
    conn.commit()


RANKING_QUERY = """
WITH
priority_gpu AS (
    SELECT DISTINCT ON (leaderboard_id)
        leaderboard_id,
        gpu_type
    FROM leaderboard.gpu_type
    ORDER BY leaderboard_id,
        CASE gpu_type
            WHEN 'B200' THEN 1
            WHEN 'H100' THEN 2
            WHEN 'MI300' THEN 3
            WHEN 'A100' THEN 4
            WHEN 'L4'   THEN 5
            WHEN 'T4'   THEN 6
            ELSE 7
        END,
        gpu_type
),

active_leaderboards AS (
    SELECT id, name
    FROM leaderboard.leaderboard
    WHERE deadline > NOW() OR deadline IS NULL
),

personal_best_candidates AS (
    SELECT
        r.runner,
        s.leaderboard_id,
        s.user_id,
        u.user_name,
        r.score,
        RANK() OVER (
            PARTITION BY s.leaderboard_id, r.runner, s.user_id
            ORDER BY r.score ASC
        ) AS personal_submission_rank
    FROM leaderboard.runs r
    JOIN leaderboard.submission s ON r.submission_id = s.id
    JOIN active_leaderboards a ON s.leaderboard_id = a.id
    JOIN priority_gpu p ON p.leaderboard_id = s.leaderboard_id
        AND p.gpu_type = r.runner
    LEFT JOIN leaderboard.user_info u ON s.user_id = u.id
    WHERE NOT r.secret
        AND r.score IS NOT NULL
        AND r.passed
),

personal_best_runs AS (
    SELECT * FROM personal_best_candidates
    WHERE personal_submission_rank = 1
),

ranked_users AS (
    SELECT
        leaderboard_id,
        runner,
        user_id,
        user_name,
        score,
        RANK() OVER (
            PARTITION BY leaderboard_id, runner
            ORDER BY score ASC
        ) AS user_rank
    FROM personal_best_runs
)

SELECT
    a.id AS leaderboard_id,
    a.name AS leaderboard_name,
    p.gpu_type,
    r.user_rank AS rank,
    r.user_id,
    r.user_name,
    r.score
FROM active_leaderboards a
JOIN priority_gpu p ON p.leaderboard_id = a.id
JOIN ranked_users r ON r.leaderboard_id = a.id AND r.runner = p.gpu_type
WHERE r.user_rank <= 3
ORDER BY a.id, r.user_rank;
"""


def fetch_current_top3(conn):
    """Run the ranking query. Returns list of dicts."""
    with conn.cursor() as cur:
        cur.execute(RANKING_QUERY)
        columns = [desc[0] for desc in cur.description]
        rows = cur.fetchall()
    return [dict(zip(columns, row)) for row in rows]


def fetch_previous_snapshot(conn):
    """Load all rows from ranking_snapshot. Returns list of dicts."""
    with conn.cursor() as cur:
        cur.execute("""
            SELECT leaderboard_id, gpu_type, rank, user_id, user_name, score
            FROM leaderboard.ranking_snapshot
        """)
        columns = [desc[0] for desc in cur.description]
        rows = cur.fetchall()
    return [dict(zip(columns, row)) for row in rows]


def update_snapshot(conn, current_rankings):
    """Upsert current top 3 into snapshot table."""
    with conn.cursor() as cur:
        for entry in current_rankings:
            cur.execute("""
                INSERT INTO leaderboard.ranking_snapshot
                    (leaderboard_id, gpu_type, rank, user_id, user_name, score, snapshot_time)
                VALUES (%s, %s, %s, %s, %s, %s, NOW())
                ON CONFLICT (leaderboard_id, gpu_type, rank)
                DO UPDATE SET
                    user_id = EXCLUDED.user_id,
                    user_name = EXCLUDED.user_name,
                    score = EXCLUDED.score,
                    snapshot_time = EXCLUDED.snapshot_time
            """, (
                entry["leaderboard_id"], entry["gpu_type"], entry["rank"],
                entry["user_id"], entry["user_name"], entry["score"],
            ))
    conn.commit()


def cleanup_inactive(conn, inactive_lb_ids):
    """Remove snapshot rows for leaderboards that are no longer active."""
    if not inactive_lb_ids:
        return
    with conn.cursor() as cur:
        cur.execute(
            "DELETE FROM leaderboard.ranking_snapshot WHERE leaderboard_id = ANY(%s)",
            (list(inactive_lb_ids),),
        )
    conn.commit()


def _group_by_leaderboard(entries):
    """Group ranking entries by leaderboard_id. Returns {lb_id: {rank: entry}}."""
    grouped = {}
    for entry in entries:
        lb_id = entry["leaderboard_id"]
        rank = entry["rank"]
        if lb_id not in grouped:
            grouped[lb_id] = {}
        grouped[lb_id][rank] = entry
    return grouped


def detect_changes(previous, current):
    """
    Compare previous and current rankings.

    Returns:
        messages: list of Discord message strings
        inactive_lb_ids: set of leaderboard IDs no longer active
    """
    prev_by_lb = _group_by_leaderboard(previous)
    curr_by_lb = _group_by_leaderboard(current)

    messages = []

    for lb_id, curr_ranks in curr_by_lb.items():
        prev_ranks = prev_by_lb.get(lb_id, {})

        # Get leaderboard metadata from any current entry
        sample = next(iter(curr_ranks.values()))
        lb_name = sample.get("leaderboard_name", f"Leaderboard {lb_id}")
        gpu = sample.get("gpu_type", "")

        prev_user_ids = {e["user_id"] for e in prev_ranks.values()}
        curr_user_ids = {e["user_id"] for e in curr_ranks.values()}

        parts = []

        # Check each rank position for changes
        for rank in sorted(curr_ranks.keys()):
            curr_entry = curr_ranks[rank]
            prev_entry = prev_ranks.get(rank)

            if prev_entry is None:
                # New rank slot (first time we see this leaderboard/rank)
                continue
            if prev_entry["user_id"] == curr_entry["user_id"]:
                # Same person at same rank — no notification
                continue

            # Different person at this rank
            if rank == 1 and prev_entry["user_id"] != curr_entry["user_id"]:
                # Special dethrone message for #1
                tmpl = random.choice(DETHRONE_TEMPLATES)
                parts.append(tmpl.format(
                    new_mention=mention(curr_entry["user_id"]),
                    old_mention=mention(prev_entry["user_id"]),
                    leaderboard=lb_name,
                    gpu=gpu,
                    score=format_score(curr_entry["score"]),
                ))
            else:
                tmpl = random.choice(CONGRATS_TEMPLATES)
                parts.append(tmpl.format(
                    mention=mention(curr_entry["user_id"]),
                    rank=rank,
                    leaderboard=lb_name,
                    gpu=gpu,
                    score=format_score(curr_entry["score"]),
                ))

        # Users bumped out of top 3 entirely
        bumped = prev_user_ids - curr_user_ids
        for uid in bumped:
            # Find their old entry for the name
            old_entry = next(e for e in prev_ranks.values() if e["user_id"] == uid)
            tmpl = random.choice(TRASH_TALK_TEMPLATES)
            parts.append(tmpl.format(
                mention=mention(old_entry["user_id"]),
                leaderboard=lb_name,
            ))

        if parts:
            messages.append("\n".join(parts))

    # Find leaderboards that were in previous snapshot but are no longer active
    inactive_lb_ids = set(prev_by_lb.keys()) - set(curr_by_lb.keys())

    return messages, inactive_lb_ids


def send_webhook(webhook_url, messages):
    """Send messages to Discord webhook."""
    for msg in messages:
        try:
            payload = {
                "content": msg,
                "allowed_mentions": {"parse": ["users"]},
            }
            resp = requests.post(webhook_url, json=payload, timeout=10)
            if resp.status_code == 429:
                retry_after = resp.json().get("retry_after", 5)
                logger.warning("Rate limited, sleeping %s seconds", retry_after)
                time.sleep(retry_after)
                requests.post(webhook_url, json=payload, timeout=10)
            elif not resp.ok:
                logger.error("Webhook returned %s: %s", resp.status_code, resp.text)
        except Exception:
            logger.exception("Failed to send webhook message")
        time.sleep(1)  # Respect Discord rate limits


def _print_rankings(label, entries):
    """Pretty-print a set of ranking entries grouped by leaderboard."""
    by_lb = {}
    for entry in entries:
        lb_id = entry["leaderboard_id"]
        if lb_id not in by_lb:
            by_lb[lb_id] = {
                "name": entry.get("leaderboard_name", f"Leaderboard {lb_id}"),
                "gpu": entry.get("gpu_type", "?"),
                "entries": [],
            }
        by_lb[lb_id]["entries"].append(entry)

    print(f"\n=== {label} ({len(entries)} entries) ===\n")
    if not entries:
        print("  (empty)\n")
        return
    for lb_id, data in sorted(by_lb.items()):
        print(f"  {data['name']} ({data['gpu']}):")
        for e in sorted(data["entries"], key=lambda x: x["rank"]):
            print(f"    #{e['rank']}  {e['user_name'] or e['user_id']}  {format_score(e['score'])}")
        print()


def poll_cycle(conn, webhook_url, seed_only=False):
    """
    Run a single poll cycle: fetch rankings, compare, notify, update snapshot.

    Args:
        conn: database connection
        webhook_url: Discord webhook URL (None to skip sending)
        seed_only: if True and snapshot is empty, seed without notifications

    Returns:
        (current, previous, messages, inactive_lbs)
    """
    current = fetch_current_top3(conn)
    previous = fetch_previous_snapshot(conn)

    if seed_only and not previous:
        logger.info("Seeding snapshot with %d entries (no notifications)", len(current))
        update_snapshot(conn, current)
        return current, previous, [], set()

    messages, inactive_lbs = detect_changes(previous, current)

    if messages and webhook_url:
        logger.info("Detected %d ranking change(s), sending notifications", len(messages))
        send_webhook(webhook_url, messages)
    elif not messages:
        logger.info("No ranking changes detected")

    update_snapshot(conn, current)
    cleanup_inactive(conn, inactive_lbs)
    return current, previous, messages, inactive_lbs


def main():
    parser = argparse.ArgumentParser(description="Ranking notification worker")
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Query rankings and print what would be sent, without writing to DB or Discord",
    )
    parser.add_argument(
        "--test",
        action="store_true",
        help="Run a single cycle (seed snapshot if empty, detect changes, send webhook, then exit)",
    )
    args = parser.parse_args()

    webhook_url = os.environ.get("DISCORD_RANKING_WEBHOOK_URL")
    if not webhook_url and not args.dry_run:
        logger.error("DISCORD_RANKING_WEBHOOK_URL not set, exiting")
        sys.exit(1)

    if not os.environ.get("DATABASE_URL"):
        logger.error("DATABASE_URL not set, exiting")
        sys.exit(1)

    conn = get_connection()
    ensure_snapshot_table(conn)

    if args.dry_run:
        try:
            current = fetch_current_top3(conn)
            previous = fetch_previous_snapshot(conn)

            _print_rankings("Current Top 3 Rankings", current)
            _print_rankings("Previous Snapshot", previous)

            if previous:
                messages, inactive_lbs = detect_changes(previous, current)
                print(f"=== Changes Detected: {len(messages)} message(s) ===\n")
                for i, msg in enumerate(messages, 1):
                    print(f"  Message {i}:")
                    for line in msg.split("\n"):
                        print(f"    {line}")
                    print()
                if inactive_lbs:
                    print(f"  Inactive leaderboards to clean up: {inactive_lbs}\n")
            else:
                print("=== No previous snapshot — would seed without sending messages ===\n")

            print("(dry run — no changes written to DB or Discord)")
        finally:
            conn.close()
        return

    if args.test:
        try:
            current, previous, messages, _ = poll_cycle(conn, webhook_url, seed_only=True)
            if not previous:
                logger.info("Snapshot seeded. Run --test again to detect changes.")
        finally:
            conn.close()
        return

    # Normal continuous polling
    conn.close()
    logger.info("Ranking worker started. Polling every %d seconds.", POLL_INTERVAL)

    while True:
        try:
            conn = get_connection()
            try:
                poll_cycle(conn, webhook_url, seed_only=True)
            finally:
                conn.close()
        except Exception:
            logger.exception("Error in poll cycle")

        time.sleep(POLL_INTERVAL)


if __name__ == "__main__":
    main()
