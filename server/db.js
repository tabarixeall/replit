"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sessionMiddleware = exports.db = void 0;
var serverless_1 = require("@neondatabase/serverless");
var neon_serverless_1 = require("drizzle-orm/neon-serverless");
var ws_1 = require("ws");
var schema = require("@shared/schema.ts.js");
var dotenv_1 = require("dotenv");
dotenv_1.default.config();
var express_session_1 = require("express-session");
var connect_pg_simple_1 = require("connect-pg-simple");
serverless_1.neonConfig.webSocketConstructor = ws_1.default;
import dotenv from 'dotenv';
dotenv.config();
if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
}
// ✅ Create a single pool for both Drizzle and session store with SSL
var pool = new serverless_1.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
});
// ✅ Drizzle ORM client
exports.db = (0, neon_serverless_1.drizzle)({ client: pool, schema: schema });
// ✅ Session store using the same pool
exports.sessionMiddleware = (0, express_session_1.default)({
    store: new ((0, connect_pg_simple_1.default)(express_session_1.default))({
        pool: pool, // reuse the same SSL-enabled pool
        tableName: "session",
    }),
    secret: process.env.SESSION_SECRET || "supersecret",
    resave: false,
    saveUninitialized: false,
});
