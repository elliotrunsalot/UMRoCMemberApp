"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const serverless_http_1 = __importDefault(require("serverless-http"));
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const db_1 = require("./db");
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Users Routes
app.get('/users', async (req, res) => {
    try {
        const client = await (0, db_1.getDbClient)();
        const result = await client.query('SELECT * FROM users');
        res.json(result.rows);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
app.get('/users/:id', async (req, res) => {
    try {
        const client = await (0, db_1.getDbClient)();
        const result = await client.query('SELECT * FROM users WHERE id = $1', [req.params.id]);
        if (result.rows.length === 0)
            return res.status(404).json({ error: 'User not found' });
        res.json(result.rows[0]);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
// Events Routes
app.get('/events', async (req, res) => {
    try {
        const client = await (0, db_1.getDbClient)();
        const result = await client.query('SELECT * FROM events ORDER BY event_date ASC');
        res.json(result.rows);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
app.post('/events', async (req, res) => {
    // Basic auth check would go here
    try {
        const { id, title, date, description } = req.body;
        const client = await (0, db_1.getDbClient)();
        await client.query('INSERT INTO events (id, title, event_date, description) VALUES ($1, $2, $3, $4)', [id, title, date, description]);
        res.json({ success: true });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to create event' });
    }
});
app.post('/events/:id/rsvp', async (req, res) => {
    try {
        const { userId, status } = req.body;
        const eventId = req.params.id;
        const client = await (0, db_1.getDbClient)();
        // This is a naive implementation using JSONB manipulation. 
        // ideally we'd normalize RSVPs into a table, but for this migration we stick to the JSONB structure
        const rsvpObj = { userId, status, timestamp: new Date().toISOString() };
        // Remove existing RSVP for this user
        // Then append new one
        // Note: In Postgres JSONB, this is a bit complex. 
        // Simplest generic way: Read, Modify, Update. Concurrency issues possible but negligible for this scale.
        const evtRes = await client.query('SELECT rsvps FROM events WHERE id = $1', [eventId]);
        if (evtRes.rows.length === 0)
            return res.status(404).json({ error: 'Event not found' });
        let rsvps = evtRes.rows[0].rsvps || [];
        rsvps = rsvps.filter((r) => r.userId !== userId);
        rsvps.push(rsvpObj);
        await client.query('UPDATE events SET rsvps = $1 WHERE id = $2', [JSON.stringify(rsvps), eventId]);
        res.json({ success: true });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error processing RSVP' });
    }
});
// Products/Orders Routes (Stubbed for brevity, following same pattern)
app.get('/products', async (req, res) => {
    const client = await (0, db_1.getDbClient)();
    const result = await client.query('SELECT * FROM products');
    res.json(result.rows);
});
// Blast Messages Routes
app.get('/blast-messages', async (req, res) => {
    try {
        const client = await (0, db_1.getDbClient)();
        // Requirement: load most recent message first
        const result = await client.query('SELECT * FROM blast_messages ORDER BY date_sent DESC');
        res.json(result.rows);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
app.post('/blast-messages', async (req, res) => {
    try {
        const { id, subject, message, sent_by } = req.body;
        const client = await (0, db_1.getDbClient)();
        await client.query('INSERT INTO blast_messages (id, subject, message, sent_by) VALUES ($1, $2, $3, $4)', [id, subject, message, sent_by]);
        res.json({ success: true });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to save blast message' });
    }
});
// Local development support
if (require.main === module) {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
}
exports.handler = (0, serverless_http_1.default)(app);
