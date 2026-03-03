# Caching Best Practices

## Redis Caching Footguns

### 1. Stale Cache on Status Change
**Problem:** Cached data becomes stale when entity status changes (e.g., leaderboard deadline extended).

**Solution:** Admin uses `?force_refresh_cache` to manually refresh:
```
GET /api/leaderboard-summaries?force_refresh_cache
```

### 2. Singleton Not Actually Single
**Problem:** Singleton returns early only when not None, but None is a valid "initialized" state.

```python
# ⚠️ Checks env var every time when REDIS_URL not set (acceptable, getenv is cheap)
_client = None
def get_connection():
    if _client is not None:
        return _client
    url = os.getenv("REDIS_URL")
    if url is None:
        return None  # _client still None, will re-check next time
```

**Alternative:** Use sentinel (`...`) if you want strict single-check.

### 3. SQL Injection in Dynamic Queries
```python
# ❌ Wrong - string formatting
ids_str = ",".join(str(id) for id in ids)
query = f"SELECT * FROM table WHERE id IN ({ids_str})"
cur.execute(query)

# ✅ Correct - parameterized queries
cur.execute("SELECT * FROM table WHERE id IN %s", (tuple(ids),))
```

## Quick Reference

| Issue | Solution |
|-------|----------|
| Stale cache | Admin: `?force_refresh_cache` |
| Singleton check | Accept getenv cost or use sentinel |
| SQL injection | Parameterized queries |
