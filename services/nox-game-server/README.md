# NOX KISS — Appwrite Game Backend (Free-Tier First)

## Current architecture decision

The current implementation direction is to use Appwrite services for the first NOX KISS backend phase, rather than provisioning Oracle Cloud or Railway.

- **Existing NOX Appwrite project/account:** remains the source of user identity and core application data.
- **Dedicated NOX GAME Appwrite project/account (proposed):** isolates game-room data, game records, and game-related functions.
- **NOX client:** uses the existing NOX identity flow and accesses game services through authenticated, server-validated requests.

A second Appwrite account/project is an organizational separation, not extra compute capacity. It does not automatically increase free-tier quotas or create a continuously running game-server process.

## Important runtime boundary

Appwrite Database and Realtime can support persisted room records and live subscriptions. Appwrite Functions are event/request-driven executions; they should not be treated as a permanently running Node.js game loop or a guaranteed always-on WebSocket game process.

Therefore, the initial Appwrite-only design must:
- Persist durable room state and round results in the database.
- Treat Realtime as a delivery/subscription mechanism, not the authority for game rules.
- Validate every game action in trusted server-side code before accepting state changes.
- Support reconnect by loading the latest persisted room state.
- Avoid promising uninterrupted 24/7 room execution or 450 concurrent players until limits, quotas, and load tests prove it.

## Identity and project-to-project trust

If NOX GAME is created under a separate Appwrite account/project:
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

## Phased implementation

1. Inspect the existing Appwrite project configuration without changing production settings.
2. Confirm the current free-plan quotas and whether a second project/account is permitted and useful; do not create accounts or paid resources automatically.
3. Design and test the cross-project identity verification flow.
4. Define game collections, indexes, permissions, and server-side functions.
5. Implement room actions with server-side validation and persistence.
6. Add Realtime subscriptions for accepted state changes.
7. Test one room, disconnect/reconnect, creator departure, moderator takeover, and concurrent players.
8. Measure resource usage and connection limits before considering the 30-room / 450-player target.

## Current status

This file records the Appwrite-first architecture direction only. No second Appwrite account/project has been created, no Appwrite console settings or production data have been changed, and no game backend has been deployed. The Oracle architecture branch and the earlier draft PR are left untouched.
