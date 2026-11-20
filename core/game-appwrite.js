// NOX KISS game-service Appwrite client configuration.
// These identifiers are public project metadata, not API secrets.
// Never place an Appwrite API key or server secret in browser code.

import { Client } from "https://cdn.jsdelivr.net/npm/appwrite@17.0.0/+esm";

export const GAME_APPWRITE_ENDPOINT = "https://fra.cloud.appwrite.io/v1";
export const GAME_APPWRITE_PROJECT_ID = "6affebd1000a6e0f1c49";
export const GAME_DATABASE_ID = "nox_game_db";

export const gameClient = new Client()
  .setEndpoint(GAME_APPWRITE_ENDPOINT)
  .setProject(GAME_APPWRITE_PROJECT_ID);

// Realtime subscriptions should be added only after the required TablesDB
// tables, permissions, and server-side validation rules have been configured.
