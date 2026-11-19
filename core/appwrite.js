import { Client, Account, ID } from "https://cdn.jsdelivr.net/npm/appwrite@17.0.0/+esm";

export const APPWRITE_ENDPOINT = "https://fra.cloud.appwrite.io/v1";
export const APPWRITE_PROJECT_ID = "6af9ca51000735dfb692";

const client = new Client()
  .setEndpoint(APPWRITE_ENDPOINT)
  .setProject(APPWRITE_PROJECT_ID);

export const account = new Account(client);
export { ID };
