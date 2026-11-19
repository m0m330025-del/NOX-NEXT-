import { Client, Account, ID, Storage, Permission, Role } from "https://cdn.jsdelivr.net/npm/appwrite@17.0.0/+esm";

export const APPWRITE_ENDPOINT = "https://fra.cloud.appwrite.io/v1";
export const APPWRITE_PROJECT_ID = "6af9ca51000735dfb692";
// Set this to the ID of the profile-images bucket created in Appwrite Console.
export const PROFILE_BUCKET_ID = "6afec098002b1a6a6410";

const client = new Client()
  .setEndpoint(APPWRITE_ENDPOINT)
  .setProject(APPWRITE_PROJECT_ID);

export const account = new Account(client);
export const storage = new Storage(client);
export { ID, Permission, Role };
