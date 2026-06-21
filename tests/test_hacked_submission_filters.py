from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
HACKED_FILTER = "COALESCE(s.status, 'active') <> 'hacked'"


def test_leaderboard_queries_filter_hacked_submissions():
    expected_counts = {
        "kernelboard/api/leaderboard.py": 7,
        "kernelboard/api/leaderboard_summaries.py": 2,
        "kernelboard/index.py": 1,
        "kernelboard/leaderboard.py": 1,
        "ranking_worker.py": 1,
    }

    for relative_path, expected_count in expected_counts.items():
        source = (ROOT / relative_path).read_text(encoding="utf-8")
        assert source.count(HACKED_FILTER) == expected_count, relative_path
