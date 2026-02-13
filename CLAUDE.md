# Kernelboard Development Notes

## Hackathons Maintenance

The hackathons displayed on the `/lectures` page are defined in:
```
frontend/src/pages/lectures/Lectures.tsx
```

Look for the `hackathons` array around line 87. To add a hackathon:

```typescript
{
  title: "Hackathon Name",
  type: "digital",           // or "in-person"
  startDate: "2025-11-03",   // YYYY-MM-DD format
  endDate: "2026-02-20",
  location: "Online",        // or city name for in-person
  lumaUrl: "https://lu.ma/xxxxx",
  description: "Optional description",
}
```

**Only ongoing hackathons are displayed.** Past and future hackathons are automatically hidden based on the current date. No cleanup needed - just add new hackathons when they start.

## Lectures

Upcoming lectures are pulled live from Discord's scheduled events API (5-minute cache).
Requires `DISCORD_BOT_TOKEN` and `DISCORD_GUILD_ID` environment variables.

## Database Access

The production PostgreSQL database is hosted on Heroku under the `discord-cluster-manager` app:
- **Heroku Dashboard:** https://dashboard.heroku.com/apps/discord-cluster-manager
- **Connection:** Use `heroku pg:psql -a discord-cluster-manager` to connect interactively
- **Credentials:** Use `heroku pg:credentials:url -a discord-cluster-manager` to get the connection string
- **Schema:** All tables live under the `leaderboard` schema (e.g., `leaderboard.runs`, `leaderboard.submission`, `leaderboard.leaderboard`, `leaderboard.user_info`, `leaderboard.code_files`, `leaderboard.gpu_type`, `leaderboard.submission_job_status`)

### Key Tables
- `leaderboard.leaderboard` - Competition definitions (name, deadline, task JSONB)
- `leaderboard.submission` - User submissions linked to code files
- `leaderboard.runs` - Individual run results with scores (lower is better), GPU type, pass/fail
- `leaderboard.user_info` - User accounts (Discord/Google/GitHub OAuth)
- `leaderboard.gpu_type` - GPU types supported per leaderboard
- `leaderboard.code_files` - Submitted code with SHA256 hash
- `leaderboard.submission_job_status` - Job tracking (pending/running/succeeded/failed/timed_out)

### Ranking Logic
Rankings are computed via SQL window functions:
1. Best run per user per GPU type (lowest score wins, must be `passed=true`, `secret=false`, `score IS NOT NULL`)
2. Global rank via `RANK() OVER (PARTITION BY leaderboard_id, runner ORDER BY score ASC)`
3. GPU priority order: B200 > H100 > MI300 > A100 > L4 > T4

## Linting

CI enforces linting for both Python and the frontend. PRs will fail if either linter reports errors.

**Python (Ruff):**
- Check: `ruff check kernelboard/ tests/`
- Auto-fix: `ruff check --fix kernelboard/ tests/`
- Config: `pyproject.toml` under `[tool.ruff]`

**Frontend (ESLint):**
- Check: `cd frontend && npm run lint`
- Auto-fix: `cd frontend && npm run lint -- --fix`

## Project Structure

- `kernelboard/` - Flask backend
- `frontend/` - React frontend (Vite + TypeScript + MUI)
- `kernelboard/api/events.py` - Discord events API integration
