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
const db_1 = require("./db");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
async function main() {
    console.log('Initializing Database...');
    console.log(`Connecting to ${process.env.DB_HOST} as ${process.env.DB_USER}`);
    try {
        const client = await (0, db_1.getDbClient)();
        // Read schema file
        // Since we are running from dist/ (compiled), schema is one level up in root (or copied there)
        // We will assume the runner sets the CWD correctly or handles the path
        const schemaPath = path.resolve(__dirname, '../schema.sql');
        if (!fs.existsSync(schemaPath)) {
            console.error(`Schema file not found at ${schemaPath}`);
            process.exit(1);
        }
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');
        console.log('Applying Schema...');
        await client.query(schemaSql);
        console.log('Database Initialized Successfully!');
        process.exit(0);
    }
    catch (err) {
        console.error('Failed to initialize DB:', err);
        process.exit(1);
    }
}
main();
