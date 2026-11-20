# NOX KISS — Oracle Cloud Game Server

## Architecture decision

- **Oracle Cloud Infrastructure (OCI):** hosts the independent, authoritative NOX KISS game server.
- **Appwrite:** remains responsible for user identity, sessions, profiles, friendships, and application data. It is not the game-server runtime.
- **NOX web client:** connects to Appwrite for identity/data and to this service for live game sessions.

## Runtime direction

- Node.js LTS service, containerized with Docker.
- WebSocket transport for room presence and live game events; HTTPS endpoints for health and operational checks.
- Server-authoritative room state: clients send intents, the server validates and broadcasts accepted state changes.
- Room capacity is **15 seats**, one seat per player.
- Initial deployment target: a Linux ARM VM on OCI, subject to current tenancy availability and quota. Do not assume an Always Free shape is available until the OCI Console confirms it.

## Security boundaries

1. The client obtains its signed-in session from Appwrite.
2. The client presents an Appwrite JWT when opening an authenticated game connection.
3. The game service verifies the JWT with Appwrite using a server-side SDK/client configured with the JWT; it must not trust a user ID supplied by the client.
4. OCI secrets and Appwrite API keys are stored as server environment secrets, never committed to Git.
5. Validate room membership, seat ownership, owner/moderator permissions, rate limits, and event payloads on the server.

## Initial game responsibilities

- Create/join/leave rooms and reserve/release seats.
- Enforce the 15-player room limit and one-seat-per-player rule.
- Maintain authoritative room presence and game-round state.
- Broadcast room changes over WebSockets.
- Persist durable results and user-facing records through the appropriate data layer; transient live state stays in the game service.

## Delivery phases

1. Confirm OCI tenancy, region, quotas, and available VM shape.
2. Implement and test the standalone Node.js game service locally/CI.
3. Add container and deployment configuration.
4. Provision OCI networking and VM only after the owner approves the exact resources and expected costs.
5. Deploy behind HTTPS/WSS, configure secrets, and run connection/room-load tests.
6. Connect the NOX client and verify Appwrite-authenticated sessions end-to-end.

## Current status

This branch contains the architecture decision only. No OCI resources have been created, no server has been deployed, and no Appwrite or production settings have been changed.
