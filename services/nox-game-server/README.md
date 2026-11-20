# NOX KISS — Appwrite Game Backend (Free-Tier First)

## Current architecture decision

The first NOX KISS backend phase uses a dedicated Appwrite project for game data, while the existing NOX Appwrite project remains the identity/application project.

### Confirmed Appwrite projects

- **Existing NOX application project:** `6af9ca51000735dfb692`
- **Dedicated game project:** `6affebd1000a6e0f1c49` (`NOX GAME SERVER`)
- **Endpoint:** `https://fra.cloud.appwrite.io/v1`
- **Game database:** `NOX_GAME_DB`, database ID `nox_game_db`, type `TablesDB`
- **Database status:** created. Seven game tables have now been created in the Appwrite Console; see the schema inventory below. No sample rows exist.

A second Appwrite account/project is an organizational separation, not extra compute capacity. It does not automatically increase free-tier quotas or create a continuously running game-server process.

## GitHub integration status

The Appwrite database was configured manually in the Console. GitHub contains the project documentation only; this does **not** mean Appwrite has been connected to GitHub as a deployment integration, and it does not deploy the game backend. No API key or server secret belongs in Git.

## Important runtime boundary

Appwrite Database and Realtime can support persisted room records and live subscriptions. Appwrite Functions are event/request-driven executions; they should not be treated as a permanently running Node.js game loop or a guaranteed always-on WebSocket game process.

Therefore, the initial Appwrite-only design must:
- Persist durable room state and round results in the database.
- Treat Realtime as a delivery/subscription mechanism, not the authority for game rules.
- Validate every game action in trusted server-side code before accepting state changes.
- Support reconnect by loading the latest persisted room state.
- Avoid promising uninterrupted 24/7 room execution or 450 concurrent players until limits, quotas, and load tests prove it.

## Identity and project-to-project trust

Because NOX GAME is a separate Appwrite project/account:
1. The NOX client authenticates through the existing NOX identity project.
2. The game backend must establish and verify a trusted identity assertion through a server-side integration.
3. The game backend must never trust a user ID, role, room owner, or moderator claim supplied only by the client.
4. Keep API keys and integration secrets server-side; never commit them to Git or expose them in browser code.
5. Do not assume an Appwrite session from one project is automatically valid in another project. Verify the chosen token exchange/verification flow before implementation.

## Game rules to preserve

- Exactly **15 seats** per room, one seat per player.
- The room must not be deleted or the round terminated merely because its creator disconnects.
- Owner/moderator permissions are checked server-side.
- Room state and results survive client disconnects and service restarts because durable state is persisted.
- Reconnecting players reload authoritative persisted state before receiving live updates.

## Next implementation phases

1. Verify the client configuration from the NOX app without exposing server credentials.
2. Verify the table IDs and security settings, then add the required indexes and narrowly scoped permissions.
3. Design and test the cross-project identity verification flow.
4. Implement room actions with server-side validation and persistence.
5. Add Realtime subscriptions for accepted state changes.
6. Test one room, disconnect/reconnect, creator departure, moderator takeover, and concurrent players.
7. Measure resource usage and connection limits before considering the 30-room / 450-player target.

## Current status

- The dedicated Appwrite project and its TablesDB database have been created.
- Seven tables exist: `players`, `rooms`, Room Members, `rounds`, `chat_messages`, `friendships`, and `song_queue`.
- `players` columns: `userId`, `noxId` (string, 32), `displayName` (string, 100), `avatarUrl` (string, 2048), `createdAt` (datetime), `lastSeenAt` (datetime), plus Appwrite system columns.
- `rooms` columns: `ownerId` (string, 128), `name` (string), `isPrivate` (boolean), `status` (string, 24), `createdAt`, `lastActivityAt`, `expiresAt` (datetime), `maxPlayers` (integer, min 1/max 15). The UI did not set a default value; application code must set 15 when creating rooms.
- Room Members table ID shown by Appwrite: `6afffa0a0010c9327b14`; columns: `roomId` (string, 36), `playerId` (string, 128), `seatNumber` (integer, 1–15), `role` (string, 24), `joinedAt` (datetime), `isOnline` (boolean).
- `rounds`: `roomId` (string, 36), `status` (string, 24), `roundNumber` (integer), `startedAt`, `endedAt` (datetime, optional), `resultSummary` (long text, optional).
- `chat_messages`: `roomId` (string, 36), `senderId` (string, 128), `messageType` (string, 24), `text` (long text), `createdAt` (datetime).
- `friendships`: `requesterId` and `addresseeId` (string, 128), `status` (string, 24), `createdAt` (datetime).
- `song_queue`: `roomId` (string, 36), `playerId` and `trackId` (string, 128), `trackName` and `artistName` (string, 255), `position` (integer), `queuedAt` (datetime).
- Row-level security is confirmed enabled with no permissions on `rooms`, Room Members, `rounds`, `chat_messages`, `friendships`, and `song_queue`. The `players` security setting still needs verification.
- The Room Members table was created with an Appwrite-generated ID rather than the requested stable ID `room_members`; code must use the actual ID above until this is reconciled.
- No game functions or server deployments have been created.
- The main branch has not been changed or merged.
- The Oracle architecture branch and earlier draft PR remain untouched.
