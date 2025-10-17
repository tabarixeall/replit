import { db } from "./server/db.js";             // named import
import * as schema from "./shared/schema.js";   // relative path + .js

async function listUsers() {
  try {
    const users = await db.select().from(schema.users);
    console.table(users);
  } catch (err) {
    console.error("Error fetching users:", err);
  } finally {
    process.exit(0);
  }
}

listUsers();
