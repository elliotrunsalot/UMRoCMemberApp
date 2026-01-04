"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDbClient = getDbClient;
const pg_1 = require("pg");
const AWS = __importStar(require("aws-sdk"));
const ssm = new AWS.SSM();
let client = null;
class MySQLClient {
    conn;
    config;
    constructor(config) {
        this.config = config;
    }
    async connect() {
        // Dynamic require to avoid build issues if mysql2 isn't installed in prod env (if tailored)
        // But for this hybrid approach we assume mysql2 is in dependencies
        const mysql = require('mysql2/promise');
        this.conn = await mysql.createConnection({
            host: this.config.host,
            user: this.config.user,
            password: this.config.password,
            database: this.config.database,
            port: this.config.port || 3306
        });
        console.log('Connected to MySQL');
    }
    async query(text, params = []) {
        // Convert Postgres $n syntax to MySQL ? syntax
        // This simple regex works for linear parameters ($1, $2, $3...)
        const sql = text.replace(/\$\d+/g, '?');
        // Handle serialization of objects/arrays if necessary (pg does this automatically for JSONB)
        // mysql2 usually expects values. 
        // Note: The app code manually uses JSON.stringify for some updates, so we might need to be careful.
        // But for params passed as arrays/objects, mysql2 might need them stringified if the column is JSON.
        // Let's rely on mysql2's default behavior first.
        const [rows] = await this.conn.execute(sql, params);
        // Normalize result to match pg 'result.rows'
        // 'execute' returns [rows, fields]
        return { rows: Array.isArray(rows) ? rows : [rows] };
    }
    async end() {
        if (this.conn)
            await this.conn.end();
    }
}
async function getDbClient() {
    if (client)
        return client;
    // Determine DB type. Default to Postgres for AWS safety, but check for local flag or specific config.
    // Use DB_TYPE env var, or infer from DB_PORT (5432 vs 3306)
    const dbType = process.env.DB_TYPE || (process.env.DB_PORT === '3306' ? 'mysql' : 'postgres');
    // Default creds for local testing if env vars missing (User asked to "create the database... locally")
    // We'll set sensible local defaults if on D: drive context (inferred by user request)
    // but code should be robust.
    const dbConfig = {
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '100%UMRoC', // Empty password default for local MySQL
        database: process.env.DB_NAME || 'umroc_member_app',
        port: parseInt(process.env.DB_PORT || (dbType === 'mysql' ? '3306' : '5432')),
        // ssl: { rejectUnauthorized: false } // Only for RDS
    };
    if (dbType === 'mysql') {
        client = new MySQLClient(dbConfig);
    }
    else {
        // Postgres
        const pgConfig = {
            ...dbConfig,
            ssl: process.env.DB_HOST && process.env.DB_HOST.includes('rds') ? { rejectUnauthorized: false } : undefined
        };
        client = new pg_1.Client(pgConfig);
    }
    await client.connect();
    return client;
}
