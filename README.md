# Fortnite NAC tournament schedule bot

Node.js Discord bot with `/weekly`, `/today`, `/tomorrow`, `/refresh`, `/setup`, and `/postnow`. Automatically posts Monday 9 AM America/New_York.

## Railway
Deploy this repository as a Node service (`npm start`). Set `DISCORD_TOKEN`, `DISCORD_CLIENT_ID`, `FORTNITE_API_KEY` in Railway Variables; optionally `DISCORD_GUILD_ID` for immediate slash-command registration, `TIMEZONE`, `FORTNITE_EVENTS_URL`. Invite the bot with `bot` and `applications.commands` scopes and permission to send messages/embed links. Use `/setup channel:#channel` to select the posting channel.

**Note:** Tournament API integration has not been validated against a live response. Check API access, payload schema, and logs before relying on schedules. Channel settings saved in state.json are ephemeral on Railway unless a persistent volume is mounted at the working directory.
