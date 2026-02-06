# Heroku Review Apps Setup

This document describes how to set up Heroku Review Apps for PR preview deployments.

## Prerequisites

- Heroku CLI installed (`brew tap heroku/brew && brew install heroku`)
- Access to the Heroku team (`kernelbot`)
- Admin access to the GitHub repository

## Setup Steps

### 1. Create a Heroku Pipeline

```bash
heroku pipelines:create kernelboard --app kernelboard --stage production --team kernelbot
```

### 2. Connect GitHub

1. Go to the [Heroku Dashboard](https://dashboard.heroku.com)
2. Navigate to your pipeline
3. Click "Connect to GitHub" and authorize the repository

### 3. Enable Review Apps

1. In the pipeline view, click "Enable Review Apps"
2. Check "Create new review apps for new pull requests automatically"
3. Check "Destroy stale review apps automatically" (recommended: after 5 days)

```bash
heroku reviewapps:enable --pipeline kernelboard --autodeploy --autodestroy
```

### 4. Configure Environment Variables

Review apps auto-provision:
- `DATABASE_URL` (from heroku-postgresql add-on)
- `REDIS_URL` (from heroku-redis add-on)
- `SECRET_KEY` (auto-generated in code)

Discord environment variables are optional for previews. The app will run without them, but Discord login and scheduled events won't work.

If you want full functionality, inherit these from production:
- `DISCORD_BOT_TOKEN`
- `DISCORD_GUILD_ID`
- `DISCORD_CLIENT_ID`
- `DISCORD_CLIENT_SECRET`
- `DISCORD_CLUSTER_MANAGER_API_BASE_URL`

## How It Works

1. Create a PR against `main`
2. Heroku automatically builds and deploys a preview
3. A comment with a link to the pipeline appears on the PR
4. The preview updates on every push to the PR
5. The preview is destroyed when the PR is closed/merged

## Troubleshooting

### Review app crashes on startup

Check the logs:
```bash
heroku logs --tail --app <review-app-name>
```

Common issues:
- Missing `DATABASE_URL` or `REDIS_URL` - check that add-ons were provisioned
- The `app.json` file must be present in the repository root

### Review apps not being created

1. Verify GitHub is connected: Check pipeline settings in Heroku Dashboard
2. Verify review apps are enabled: `heroku reviewapps --pipeline kernelboard`
3. Check that `app.json` exists in the repository root
