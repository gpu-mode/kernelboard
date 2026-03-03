# Caching Best Practices

## Redis Caching

### Leaderboard Summaries Cache
- **Ended leaderboards**: Cached in Redis (`lb_top_users:{id}`)
- **Active leaderboards**: Computed in real-time
- **Deadline extended**: Cache auto-deleted when leaderboard becomes active again
- **User record deleted**: ⚠️ Cache stale, admin needs run`https://www.gpumode.com/home?use_beta&force_refresh` in website
