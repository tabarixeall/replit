import pkg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "@shared/schema.js";

const { Pool } = pkg;

const connectionString =
  "postgresql://q_vdqb_user:NCuUCUNilg4MpdR1yN9rj743zR8URmEH@dpg-d3lv0m8gjchc73codb8g-a.oregon-postgres.render.com/q_vdqb";

export const pool = new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false,
  },
});

export const db = drizzle(pool, { schema });
