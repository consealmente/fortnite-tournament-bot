# Vercel deployment setup

This repository includes an initial Vercel HTTP-interactions endpoint at /api/interactions and a weekly cron at /api/cron. **The serverless adaptation is not yet feature complete:** slash-command registration, verified tournament API mapping, and automated Discord schedule delivery still require integration testing.

Set DISCORD_PUBLIC_KEY, DISCORD_TOKEN, DISCORD_CHANNEL_ID, FORTNITE_API_KEY, CRON_SECRET in Vercel environment variables. Never commit secrets.

Set the Discord application's Interactions Endpoint URL to https://YOUR_DEPLOYMENT/api/interactions. Vercel cron requires CRON_SECRET for the Authorization header. The cron currently deliberately refuses to post until the upstream tournament data shape is validated, avoiding false schedules.

The original src/index.js is a long-running bot for Railway or another persistent host and does not run on Vercel.
