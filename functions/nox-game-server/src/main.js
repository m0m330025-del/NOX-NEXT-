import { Client, Account, Databases, ID, Query, Permission, Role } from "node-appwrite";

const MAX_SEATS = 15;
const ROOM_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function json(res, status, payload) {
  return res.json(payload, status);
}

function makeRoomCode() {
  let code = "";
  for (let i = 0; i < 6; i++) code += ROOM_CODE_ALPHABET[Math.floor(Math.random() * ROOM_CODE_ALPHABET.length)];
  return code;
}

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing function environment variable: ${name}`);
  return value;
}

function parseBody(req) {
  if (req.bodyJson && typeof req.bodyJson === "object") return req.bodyJson;
  if (typeof req.body === "string") return JSON.parse(req.body || "{}");
  return req.body || {};
}

function cleanRoom(room) {
  return {
    id: room.$id,
    code: room.code,
    ownerId: room.ownerId,
    title: room.title,
    status: room.status,
    maxSeats: MAX_SEATS,
    roundNumber: room.roundNumber || 0,
    currentTurnSeat: room.currentTurnSeat ?? null,
    createdAt: room.$createdAt
  };
}

export default async ({ req, res, log, error }) => {
  const allowedOrigin = process.env.NOX_ALLOWED_ORIGIN || "*";
  const headers = {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Appwrite-JWT",
    "Vary": "Origin"
  };

  if (req.method === "OPTIONS") return res.empty(204, headers);
  if (req.method !== "POST") return json(res, 405, { ok: false, error: "METHOD_NOT_ALLOWED" }, headers);

  try {
    const endpoint = requiredEnv("APPWRITE_ENDPOINT");
    const projectId = requiredEnv("APPWRITE_PROJECT_ID");
    const apiKey = requiredEnv("APPWRITE_API_KEY");
    const databaseId = requiredEnv("NOX_DATABASE_ID");
    const roomsCollection = requiredEnv("NOX_ROOMS_COLLECTION_ID");
    const seatsCollection = requiredEnv("NOX_SEATS_COLLECTION_ID");

    const jwt = req.headers["x-appwrite-jwt"];
    if (!jwt) return json(res, 401, { ok: false, error: "AUTH_REQUIRED" }, headers);

    const authClient = new Client().setEndpoint(endpoint).setProject(projectId).setJWT(jwt);
    const account = new Account(authClient);
    let user;
    try { user = await account.get(); }
    catch { return json(res, 401, { ok: false, error: "INVALID_SESSION" }, headers); }

    const adminClient = new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
    const db = new Databases(adminClient);
    const { action, ...input } = parseBody(req);

    if (action === "room.create") {
      const title = String(input.title || "NOX KISS ROOM").trim().slice(0, 48) || "NOX KISS ROOM";
      const code = makeRoomCode();
      const room = await db.createDocument(databaseId, roomsCollection, ID.unique(), {
        code, title, ownerId: user.$id, status: "waiting",
        maxSeats: MAX_SEATS, roundNumber: 0, currentTurnSeat: null
      }, [
        Permission.read(Role.users()),
        Permission.update(Role.user(user.$id)),
        Permission.delete(Role.user(user.$id))
      ]);
      return json(res, 201, { ok: true, room: cleanRoom(room) }, headers);
    }

    if (action === "room.join") {
      const code = String(input.code || "").trim().toUpperCase();
      if (!/^[A-HJ-NP-Z2-9]{6}$/.test(code)) return json(res, 400, { ok: false, error: "INVALID_ROOM_CODE" }, headers);
      const found = await db.listDocuments(databaseId, roomsCollection, [Query.equal("code", code), Query.limit(1)]);
      const room = found.documents[0];
      if (!room) return json(res, 404, { ok: false, error: "ROOM_NOT_FOUND" }, headers);
      if (room.status !== "waiting") return json(res, 409, { ok: false, error: "ROOM_NOT_JOINABLE" });
      const existing = await db.listDocuments(databaseId, seatsCollection, [
        Query.equal("roomId", room.$id), Query.equal("userId", user.$id), Query.limit(1)
      ]);
      if (existing.documents[0]) return json(res, 200, { ok: true, room: cleanRoom(room), seat: Number(existing.documents[0].seatIndex) });
      const occupied = await db.listDocuments(databaseId, seatsCollection, [
        Query.equal("roomId", room.$id), Query.limit(MAX_SEATS)
      ]);
      const taken = new Set(occupied.documents.map(s => Number(s.seatIndex)));
      let seatIndex = -1;
      for (let i = 0; i < MAX_SEATS; i++) if (!taken.has(i)) { seatIndex = i; break; }
      if (seatIndex < 0) return json(res, 409, { ok: false, error: "ROOM_FULL" });
      try {
        await db.createDocument(databaseId, seatsCollection, `${room.$id}_${seatIndex}`, {
          roomId: room.$id, userId: user.$id, seatIndex, displayName: String(user.name || "Player").slice(0, 32),
          role: user.$id === room.ownerId ? "owner" : "player", ready: false
        }, [Permission.read(Role.users()), Permission.update(Role.user(user.$id)), Permission.delete(Role.user(user.$id))]);
      } catch (seatError) {
        // The deterministic seat document ID makes simultaneous claims conflict safely.
        if (seatError.code === 409) return json(res, 409, { ok: false, error: "SEAT_TAKEN_RETRY" });
        throw seatError;
      }
      return json(res, 200, { ok: true, room: cleanRoom(room), seat: seatIndex }, headers);
    }

    if (action === "room.leave") {
      const roomId = String(input.roomId || "");
      const rows = await db.listDocuments(databaseId, seatsCollection, [
        Query.equal("roomId", roomId), Query.equal("userId", user.$id), Query.limit(1)
      ]);
      if (!rows.documents[0]) return json(res, 200, { ok: true, left: false }, headers);
      await db.deleteDocument(databaseId, seatsCollection, rows.documents[0].$id);
      return json(res, 200, { ok: true, left: true }, headers);
    }

    if (action === "room.snapshot") {
      const roomId = String(input.roomId || "");
      const room = await db.getDocument(databaseId, roomsCollection, roomId);
      const seats = await db.listDocuments(databaseId, seatsCollection, [
        Query.equal("roomId", roomId), Query.orderAsc("seatIndex"), Query.limit(MAX_SEATS)
      ]);
      return json(res, 200, {
        ok: true, room: cleanRoom(room),
        seats: seats.documents.map(s => ({
          seat: Number(s.seatIndex), userId: s.userId, displayName: s.displayName,
          role: s.role, ready: Boolean(s.ready)
        }))
      }, headers);
    }

    if (action === "room.start") {
      const roomId = String(input.roomId || "");
      const room = await db.getDocument(databaseId, roomsCollection, roomId);
      if (room.ownerId !== user.$id) return json(res, 403, { ok: false, error: "OWNER_ONLY" });
      if (room.status !== "waiting") return json(res, 409, { ok: false, error: "ROOM_NOT_WAITING" });
      const seats = await db.listDocuments(databaseId, seatsCollection, [
        Query.equal("roomId", roomId), Query.orderAsc("seatIndex"), Query.limit(MAX_SEATS)
      ]);
      if (seats.total < 2) return json(res, 409, { ok: false, error: "NEED_TWO_PLAYERS" });
      const updated = await db.updateDocument(databaseId, roomsCollection, roomId, {
        status: "playing", roundNumber: 1, currentTurnSeat: Number(seats.documents[0].seatIndex)
      });
      return json(res, 200, { ok: true, room: cleanRoom(updated) }, headers);
    }

    return json(res, 400, { ok: false, error: "UNKNOWN_ACTION" }, headers);
  } catch (err) {
    error(err?.stack || String(err));
    const status = Number(err?.code) >= 400 && Number(err?.code) < 600 ? Number(err.code) : 500;
    return json(res, status, { ok: false, error: status === 500 ? "INTERNAL_ERROR" : "REQUEST_FAILED" }, headers);
  }
};
