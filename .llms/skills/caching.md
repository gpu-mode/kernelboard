# Caching Best Practices

## Redis Caching Footguns

### 1. Stale Cache on Status Change
**Problem:** Cached data becomes stale when entity status changes.

```python
# Example: Leaderboard deadline extended (ended → active)
# Old cached data still exists, will be used when it ends again
```

**Solution:** Delete cache when status changes:
```python
# Delete active leaderboards' cache (deadline may have been extended)
for lb_id in active_ids:
    redis.delete(f"lb_top_users:{lb_id}")
```

### 2. Singleton Not Actually Single
**Problem:** Singleton returns early only when not None, but None is a valid "initialized" state.

```python
# ❌ Wrong - checks env var every time when REDIS_URL not set
_client = None
def get_connection():
    if _client is not None:
        return _client
    url = os.getenv("REDIS_URL")
    if url is None:
        return None  # _client still None, will re-check next time
```

**Solution:** Either accept this behavior (getenv is cheap) or use sentinel:
```python
_client = ...  # Ellipsis as sentinel
def get_connection():
    if _client is not ...:
        return _client
```

### 3. SQL Injection in Dynamic Queries
**Problem:** Building SQL with string formatting.

```python
# ❌ Wrong
ids_str = ",".join(str(id) for id in ids)
query = f"WHERE id IN ({ids_str})"

# ✅ Correct - use parameterized queries
cur.execute("WHERE id IN %s", (tuple(ids),))
```

### 4. Cache Key Collisions
**Problem:** Generic cache keys without proper namespacing.

```python
# ❌ Wrong
redis.set(f"user:{user_id}", data)

# ✅ Correct - include context
redis.set(f"lb_top_users:{leaderboard_id}", data)
```

## Quick Reference

| Issue | Solution |
|-------|----------|
| Stale cache | Delete cache on status change |
| Singleton check | Use sentinel or accept getenv cost |
| SQL injection | Parameterized queries |
| Key collision | Namespace cache keys |
