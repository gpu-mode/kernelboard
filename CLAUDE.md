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

## Project Structure

- `kernelboard/` - Flask backend
- `frontend/` - React frontend (Vite + TypeScript + MUI)
- `kernelboard/api/events.py` - Discord events API integration
