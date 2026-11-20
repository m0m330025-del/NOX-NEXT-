/**
 * Idempotent NOX GAME TablesDB schema provisioner.
 *
 * Run only from a trusted local/server environment:
 *   APPWRITE_ENDPOINT=https://fra.cloud.appwrite.io/v1
 *   APPWRITE_PROJECT_ID=6affebd1000a6e0f1c49
 *   APPWRITE_DATABASE_ID=nox_game_db
 *   APPWRITE_API_KEY=<server key with database/table write permissions>
 *   node services/nox-game-server/scripts/provision-schema.mjs
 *
 * Never put the API key in source control or a browser bundle.
 * This script creates schema only; it does not seed rows or deploy services.
 */

const endpoint = (process.env.APPWRITE_ENDPOINT || "").replace(/\/$/, "");
const projectId = process.env.APPWRITE_PROJECT_ID || "";
const databaseId = process.env.APPWRITE_DATABASE_ID || "";
const apiKey = process.env.APPWRITE_API_KEY || "";

for (const [name, value] of Object.entries({
  APPWRITE_ENDPOINT: endpoint,
  APPWRITE_PROJECT_ID: projectId,
  APPWRITE_DATABASE_ID: databaseId,
  APPWRITE_API_KEY: apiKey,
})) {
  if (!value) {
    console.error(`Missing required environment variable: ${name}`);
    process.exit(1);
  }
}

const tables = [
  {
    id: "players",
    name: "Players",
    columns: [
      { key: "userId", type: "varchar", size: 128, required: true },
      { key: "noxId", type: "varchar", size: 32, required: true },
      { key: "displayName", type: "varchar", size: 100, required: true },
      { key: "avatarUrl", type: "url", required: false },
      { key: "createdAt", type: "datetime", required: true },
      { key: "lastSeenAt", type: "datetime", required: false },
    ],
  },
  {
    id: "rooms",
    name: "Rooms",
    columns: [
      { key: "ownerId", type: "varchar", size: 128, required: true },
      { key: "name", type: "varchar", size: 100, required: true },
      { key: "isPrivate", type: "boolean", required: true },
      { key: "status", type: "varchar", size: 24, required: true },
      { key: "createdAt", type: "datetime", required: true },
      { key: "lastActivityAt", type: "datetime", required: true },
      { key: "expiresAt", type: "datetime", required: true },
      { key: "maxPlayers", type: "integer", required: true },
    ],
  },
  {
    id: "room_members",
    name: "Room Members",
    columns: [
      { key: "roomId", type: "varchar", size: 36, required: true },
      { key: "playerId", type: "varchar", size: 128, required: true },
      { key: "seatNumber", type: "integer", required: true },
      { key: "role", type: "varchar", size: 24, required: true },
      { key: "joinedAt", type: "datetime", required: true },
      { key: "isOnline", type: "boolean", required: true },
    ],
  },
  {
    id: "rounds",
    name: "Rounds",
    columns: [
      { key: "roomId", type: "varchar", size: 36, required: true },
      { key: "roundNumber", type: "integer", required: true },
      { key: "status", type: "varchar", size: 24, required: true },
      { key: "startedAt", type: "datetime", required: false },
      { key: "endedAt", type: "datetime", required: false },
      { key: "resultSummary", type: "text", required: false },
    ],
  },
  {
    id: "chat_messages",
    name: "Chat Messages",
    columns: [
      { key: "roomId", type: "varchar", size: 36, required: true },
      { key: "senderId", type: "varchar", size: 128, required: true },
      { key: "messageType", type: "varchar", size: 24, required: true },
      { key: "text", type: "text", required: true },
      { key: "createdAt", type: "datetime", required: true },
    ],
  },
  {
    id: "friendships",
    name: "Friendships",
    columns: [
      { key: "requesterId", type: "varchar", size: 128, required: true },
      { key: "addresseeId", type: "varchar", size: 128, required: true },
      { key: "status", type: "varchar", size: 24, required: true },
      { key: "createdAt", type: "datetime", required: true },
    ],
  },
  {
    id: "song_queue",
    name: "Song Queue",
    columns: [
      { key: "roomId", type: "varchar", size: 36, required: true },
      { key: "playerId", type: "varchar", size: 128, required: true },
      { key: "trackId", type: "varchar", size: 128, required: true },
      { key: "trackName", type: "varchar", size: 255, required: true },
      { key: "artistName", type: "varchar", size: 255, required: true },
      { key: "position", type: "integer", required: true },
      { key: "queuedAt", type: "datetime", required: true },
    ],
  },
];

async function request(path, { method = "GET", body } = {}) {
  const response = await fetch(`${endpoint}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      "X-Appwrite-Project": projectId,
      "X-Appwrite-Key": apiKey,
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload.message || `Appwrite request failed (${response.status})`);
    error.status = response.status;
    throw error;
  }
  return payload;
}

async function ensureTable(table) {
  const tablePath = `/tablesdb/${encodeURIComponent(databaseId)}/tables/${encodeURIComponent(table.id)}`;
  try {
    await request(tablePath);
    console.log(`Table exists: ${table.id}`);
  } catch (error) {
    if (error.status !== 404) throw error;
    await request(`/tablesdb/${encodeURIComponent(databaseId)}/tables`, {
      method: "POST",
      body: {
        tableId: table.id,
        name: table.name,
        permissions: [],
        rowSecurity: true,
        enabled: true,
      },
    });
    console.log(`Created table: ${table.id}`);
  }

  const columnsPath = `${tablePath}/columns?limit=100`;
  const existing = await request(columnsPath);
  const existingKeys = new Set((existing.columns || []).map((column) => column.key));

  for (const column of table.columns) {
    if (existingKeys.has(column.key)) {
      console.log(`  Column exists: ${table.id}.${column.key}`);
      continue;
    }
    const { type, ...definition } = column;
    await request(`${tablePath}/columns/${type}`, {
      method: "POST",
      body: definition,
    });
    console.log(`  Created column: ${table.id}.${column.key} (${type})`);
  }
}

try {
  for (const table of tables) {
    await ensureTable(table);
  }
  console.log("NOX GAME schema provisioning completed. No rows were created.");
} catch (error) {
  console.error(`Schema provisioning stopped: ${error.message}`);
  process.exitCode = 1;
}
