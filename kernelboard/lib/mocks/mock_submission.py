"""
Mock submission for local development and testing.

This simulates the real submission flow from discord-cluster-manager:
1. Create submission in DB (with code_files entry)
2. Create job status entry
3. After 10s: Create "test" run
4. After 20s: Create "leaderboard" run, mark done

Usage:
  1. Set USE_MOCK_SUBMISSION = True in submission.py
  2. Submit code normally - it will use mock instead of real API
"""

import json
import logging
import os
import random
import threading
import time
from datetime import datetime, timezone
from typing import Optional

import psycopg2

from kernelboard.lib.status_code import http_error, http_success

logger = logging.getLogger(__name__)


def _get_standalone_db_connection():
    """
    Get a standalone DB connection for background threads.
    This doesn't use Flask's g object, so it works outside request context.
    """
    database_url = os.environ.get("DATABASE_URL")
    if not database_url:
        raise RuntimeError("DATABASE_URL is not set")
    return psycopg2.connect(database_url)


def _get_leaderboard_id(leaderboard_name: str) -> int:
    """Get leaderboard ID from name."""
    conn = _get_standalone_db_connection()
    cur = conn.cursor()

    try:
        cur.execute(
            """
            SELECT id FROM leaderboard.leaderboard WHERE name = %s
            """,
            (leaderboard_name,),
        )
        result = cur.fetchone()
        if result:
            return result[0]
        # Default to 1 if not found
        return 1
    finally:
        cur.close()
        conn.close()


def _create_submission(
    leaderboard_id: int,
    user_id: str,
    file_name: str,
    code: str = "# mock submission code",
) -> int:
    """
    Create a submission record following discord-cluster-manager pattern.
    """
    conn = _get_standalone_db_connection()
    cur = conn.cursor()

    try:
        # 1. Check if code already exists (by hash)
        cur.execute(
            """
            SELECT id FROM leaderboard.code_files
            WHERE hash = encode(sha256(%s::bytea), 'hex')
            """,
            (code.encode("utf-8"),),
        )
        result = cur.fetchone()

        if result:
            code_id = result[0]
        else:
            # Insert new code
            cur.execute(
                """
                INSERT INTO leaderboard.code_files (code)
                VALUES (%s)
                RETURNING id
                """,
                (code.encode("utf-8"),),
            )
            code_id = cur.fetchone()[0]

        # 2. Create submission
        cur.execute(
            """
            INSERT INTO leaderboard.submission
            (leaderboard_id, file_name, user_id, code_id, submission_time, done)
            VALUES (%s, %s, %s, %s, %s, false)
            RETURNING id
            """,
            (leaderboard_id, file_name, user_id, code_id, datetime.now(timezone.utc)),
        )
        submission_id = cur.fetchone()[0]

        # 3. Create job status entry (pending)
        cur.execute(
            """
            INSERT INTO leaderboard.submission_job_status
            (submission_id, status, created_at, last_heartbeat)
            VALUES (%s, %s, %s, %s)
            ON CONFLICT (submission_id) DO UPDATE
            SET status = EXCLUDED.status, last_heartbeat = EXCLUDED.last_heartbeat
            """,
            (submission_id, "pending", datetime.now(timezone.utc), datetime.now(timezone.utc)),
        )

        conn.commit()
        return submission_id

    finally:
        cur.close()
        conn.close()


def _upsert_job_status(
    submission_id: int,
    status: str,
    error: Optional[str] = None,
):
    """
    Update job status following discord-cluster-manager pattern.
    """
    conn = _get_standalone_db_connection()
    cur = conn.cursor()

    try:
        cur.execute(
            """
            INSERT INTO leaderboard.submission_job_status AS s
                (submission_id, status, error, last_heartbeat)
            VALUES (%s, %s, %s, %s)
            ON CONFLICT (submission_id) DO UPDATE
            SET
                status = COALESCE(EXCLUDED.status, s.status),
                error = COALESCE(EXCLUDED.error, s.error),
                last_heartbeat = EXCLUDED.last_heartbeat
            """,
            (submission_id, status, error, datetime.now(timezone.utc)),
        )
        conn.commit()
    finally:
        cur.close()
        conn.close()


def _create_run(
    submission_id: int,
    mode: str,
    runner: str,
    passed: bool,
    score: Optional[float] = None,
    duration: float = 5.0,
    stderr: Optional[str] = None,
    stdout: Optional[str] = None,
):
    """
    Create a run record following discord-cluster-manager pattern.

    meta contains: stdout, stderr, success, exit_code, command, duration
    result contains: benchmark results (format that toReport can parse)
    system_info contains: gpu info
    """
    conn = _get_standalone_db_connection()
    cur = conn.cursor()

    try:
        start_time = datetime.now(timezone.utc)
        end_time = start_time

        # meta follows discord-cluster-manager format
        meta = {
            "stdout": stdout or "",
            "stderr": stderr or "",
            "success": passed,
            "exit_code": 0 if passed else 1,
            "command": "mock_eval.py",
            "duration": duration,
        }

        # result format matches what toReport() expects
        if mode == "test":
            if passed:
                result = {
                    "test.0.status": "pass",
                    "test.0.spec": "test_correctness",
                    "test.0.message": "All tests passed!",
                    "test.1.status": "pass",
                    "test.1.spec": "test_performance",
                    "test.1.message": "Performance within acceptable range.",
                }
            else:
                result = {
                    "test.0.status": "fail",
                    "test.0.spec": "test_correctness",
                    "test.0.error": stderr or "Test failed",
                }
        elif mode == "benchmark":
            if passed:
                mean_ns = random.uniform(100000, 500000) * 1000
                err_ns = mean_ns * 0.05
                result = {
                    "benchmark-count": 1,
                    "benchmark.0.spec": "benchmark_kernel",
                    "benchmark.0.mean": mean_ns,
                    "benchmark.0.err": err_ns,
                    "benchmark.0.best": mean_ns * 0.95,
                    "benchmark.0.worst": mean_ns * 1.05,
                }
            else:
                result = {
                    "benchmark-count": 1,
                    "benchmark.0.status": "fail",
                    "benchmark.0.spec": "benchmark_kernel",
                    "benchmark.0.error": stderr or "Benchmark failed",
                }
        elif mode == "leaderboard" and passed and score:
            err_ns = score * 0.05
            result = {
                "benchmark-count": 1,
                "benchmark.0.spec": "leaderboard_kernel",
                "benchmark.0.mean": score,
                "benchmark.0.err": err_ns,
                "benchmark.0.best": score * 0.95,
                "benchmark.0.worst": score * 1.05,
            }
        else:
            result = {}

        # system_info
        system_info = {
            "gpu": runner,
            "driver_version": "mock-driver-535.104.05",
            "cuda_version": "12.2",
        }

        cur.execute(
            """
            INSERT INTO leaderboard.runs
            (submission_id, start_time, end_time, mode, secret, runner,
             score, passed, compilation, meta, result, system_info)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id
            """,
            (
                submission_id,
                start_time,
                end_time,
                mode,
                False,  # secret
                runner,
                score,
                passed,
                None,  # compilation
                json.dumps(meta),
                json.dumps(result),
                json.dumps(system_info),
            ),
        )
        conn.commit()
    finally:
        cur.close()
        conn.close()


def _mark_submission_done(submission_id: int):
    """Mark submission as done."""
    conn = _get_standalone_db_connection()
    cur = conn.cursor()

    try:
        cur.execute(
            """
            UPDATE leaderboard.submission
            SET done = true
            WHERE id = %s
            """,
            (submission_id,),
        )
        conn.commit()
    finally:
        cur.close()
        conn.close()


def _simulate_submission_flow(
    submission_id: int,
    submission_mode: str = "leaderboard",
    runner: str = "NVIDIA A100",
    simulate_test_failure: bool = False,
    simulate_benchmark_failure: bool = False,
):
    """
    Background thread that simulates submission flow based on submission_mode:

    - "test": Only runs test phase
    - "leaderboard": Runs test → benchmark → leaderboard (with score)
    """
    try:
        # Phase 1: Running
        logger.info(
            "[MOCK] Submission %s: Starting (mode=%s)...",
            submission_id, submission_mode
        )
        _upsert_job_status(submission_id, "running")
        time.sleep(10)

        # Phase 2: Test run (always runs first)
        test_passed = not simulate_test_failure
        test_stderr = None
        if not test_passed:
            test_stderr = (
                "Traceback (most recent call last):\n"
                '  File "/root/eval.py", line 14, in <module>\n'
                "    from utils import set_seed\n"
                "ImportError: cannot import name 'set_seed' from 'utils'\n"
            )

        logger.info(
            "[MOCK] Submission %s: Creating test run (passed=%s)",
            submission_id, test_passed
        )
        _create_run(
            submission_id=submission_id,
            mode="test",
            runner=runner,
            passed=test_passed,
            score=None,
            duration=random.uniform(1.0, 3.0),
            stderr=test_stderr,
            stdout="Running tests..." if test_passed else "",
        )

        if not test_passed:
            _upsert_job_status(submission_id, "failed", "Test phase failed")
            _mark_submission_done(submission_id)
            logger.info("[MOCK] Submission %s: Finished (test failed)", submission_id)
            return

        # For "test" mode, we're done after test passes
        if submission_mode == "test":
            _upsert_job_status(submission_id, "succeeded")
            _mark_submission_done(submission_id)
            logger.info("[MOCK] Submission %s: Finished (test mode)", submission_id)
            return

        # Phase 3: Benchmark run (for leaderboard mode)
        logger.info("[MOCK] Submission %s: Starting benchmark phase...", submission_id)
        time.sleep(10)

        benchmark_passed = not simulate_benchmark_failure
        benchmark_stderr = None
        if not benchmark_passed:
            benchmark_stderr = "RuntimeError: CUDA out of memory"

        logger.info(
            "[MOCK] Submission %s: Creating benchmark run (passed=%s)",
            submission_id, benchmark_passed
        )
        _create_run(
            submission_id=submission_id,
            mode="benchmark",
            runner=runner,
            passed=benchmark_passed,
            score=None,
            duration=random.uniform(3.0, 8.0),
            stderr=benchmark_stderr,
            stdout="Benchmark completed." if benchmark_passed else "",
        )

        if not benchmark_passed:
            _upsert_job_status(submission_id, "failed", "Benchmark phase failed")
            _mark_submission_done(submission_id)
            logger.info("[MOCK] Submission %s: Finished (benchmark failed)", submission_id)
            return

        # Phase 4: Leaderboard run (with score)
        logger.info("[MOCK] Submission %s: Creating leaderboard run...", submission_id)
        time.sleep(5)

        # Generate score in nanoseconds (like real backend)
        score_ns = random.uniform(100000, 500000) * 1000

        _create_run(
            submission_id=submission_id,
            mode="leaderboard",
            runner=runner,
            passed=True,
            score=score_ns,
            duration=random.uniform(3.0, 8.0),
            stderr=None,
            stdout="Leaderboard run completed.",
        )

        # Mark as done
        _upsert_job_status(submission_id, "succeeded")
        _mark_submission_done(submission_id)

        logger.info("[MOCK] Submission %s: Finished (succeeded)", submission_id)

    except Exception as e:
        logger.error("[MOCK] Submission %s error: %s", submission_id, e)
        _upsert_job_status(submission_id, "failed", str(e))
        _mark_submission_done(submission_id)


def create_mock_submission(
    user_id: str,
    leaderboard_name: str,
    file_name: str,
    files: dict,
    submission_mode: str = "leaderboard",
    failure_mode: str = None,
):
    """
    Called by submission.py when USE_MOCK_SUBMISSION = True.
    Mimics the real cluster API: returns submission_id immediately,
    then runs simulation in background.

    submission_mode:
    - "test": Only runs test phase
    - "leaderboard": Runs test → benchmark → leaderboard (with score)

    failure_mode:
    - None: All phases pass
    - "test": Test phase fails
    - "benchmark": Test passes, benchmark fails
    """
    try:
        # Get leaderboard_id from name
        lb_id = _get_leaderboard_id(leaderboard_name) if leaderboard_name else 1

        # Extract file content from files dict
        # files = {"file": (filename, fileobj, content_type)}
        file_content = "# mock submission code"
        if files and "file" in files:
            file_tuple = files["file"]
            if len(file_tuple) >= 2:
                fileobj = file_tuple[1]
                fileobj.seek(0)
                file_content = fileobj.read()
                if isinstance(file_content, bytes):
                    file_content = file_content.decode("utf-8")

        submission_id = _create_submission(
            leaderboard_id=lb_id,
            user_id=user_id,
            file_name=file_name or "mock.py",
            code=file_content,
        )

        logger.info(
            "[MOCK] Created submission %s (mode=%s, failure=%s) for user %s",
            submission_id, submission_mode, failure_mode, user_id
        )

        # Determine failure flags
        simulate_test_failure = failure_mode == "test"
        simulate_benchmark_failure = failure_mode == "benchmark"

        # Background thread simulates the job flow
        thread = threading.Thread(
            target=_simulate_submission_flow,
            args=(
                submission_id,
                submission_mode,
                "NVIDIA A100",
                simulate_test_failure,
                simulate_benchmark_failure,
            ),
            daemon=True,
        )
        thread.start()

        # Return same format as real cluster API
        return http_success(
            message="submission success, please refresh submission history",
            data={"details": {"id": submission_id}},
        )

    except Exception as e:
        logger.error("[MOCK] Failed to create submission: %s", e)
        return http_error(
            message=str(e),
            status_code=500,
        )
