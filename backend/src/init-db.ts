import { getDbClient } from './db';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
    console.log('Initializing Database...');
    console.log(`Connecting to ${process.env.DB_HOST} as ${process.env.DB_USER}`);

    try {
        const client = await getDbClient();

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
    } catch (err) {
        console.error('Failed to initialize DB:', err);
        process.exit(1);
    }
}

main();
