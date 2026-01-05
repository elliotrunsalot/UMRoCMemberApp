import * as mysql from 'mysql2/promise';

interface DbClient {
    connect(): Promise<void>;
    query(text: string, params?: any[]): Promise<{ rows: any[] }>;
    end(): Promise<void>;
}

let client: DbClient | null = null;

class MySQLClient implements DbClient {
    private conn: any;
    private config: any;

    constructor(config: any) {
        this.config = config;
    }

    async connect() {
        this.conn = await mysql.createConnection({
            host: this.config.host,
            user: this.config.user,
            password: this.config.password,
            database: this.config.database,
            port: this.config.port || 3306
        });
        console.log(`Connected to MySQL at ${this.config.host}:${this.config.port || 3306} as ${this.config.user} on db ${this.config.database}`);
    }

    async query(text: string, params: any[] = []) {
        // Convert Postgres $n syntax to MySQL ? syntax for compatibility with existing queries
        const sql = text.replace(/\$\d+/g, '?');

        const [rows] = await this.conn.execute(sql, params);
        // Normalize result to match pg 'result.rows' structure expected by app
        return { rows: Array.isArray(rows) ? rows : [rows] };
    }

    async end() {
        if (this.conn) await this.conn.end();
    }
}

export async function getDbClient() {
    if (client) return client;

    // Default creds for local testing
    const dbConfig = {
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME || 'umroc_member_app',
        port: parseInt(process.env.DB_PORT || '3306'),
    };

    client = new MySQLClient(dbConfig);
    await client.connect();
    return client;
}

