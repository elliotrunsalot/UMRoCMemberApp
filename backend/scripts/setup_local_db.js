const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const schemaPath = path.join(__dirname, '../schema_mysql.sql');

async function main() {
    console.log('Starting local database setup...');

    const config = {
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD,
        port: parseInt(process.env.DB_PORT || '3306'),
        multipleStatements: true // Allow running the whole schema file at once
    };

    let conn;
    try {
        console.log(`Connecting to MySQL at ${config.host}:${config.port} as ${config.user}...`);
        conn = await mysql.createConnection({
            host: config.host,
            user: config.user,
            password: config.password,
            port: config.port,
            multipleStatements: true
        });

        console.log('Connected. Creating database if needed...');
        const dbName = process.env.DB_NAME || 'umroc_member_app';
        await conn.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
        console.log(`Database '${dbName}' ensured.`);

        await conn.changeUser({ database: dbName });
        console.log(`Switched to database '${dbName}'.`);

        console.log(`Reading schema from ${schemaPath}...`);
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');

        console.log('Executing schema...');
        await conn.query(schemaSql);
        
        console.log('Schema executed successfully. Database is ready.');

    } catch (err) {
        console.error('Error setting up database:', err);
        if (err.code === 'ECONNREFUSED') {
            console.error('Could not connect to MySQL. Is it running?');
        } else if (err.code === 'ER_ACCESS_DENIED_ERROR') {
            console.error('Access denied. Please check DB_USER and DB_PASSWORD env vars.');
        }
        process.exit(1);
    } finally {
        if (conn) await conn.end();
    }
}

main();
