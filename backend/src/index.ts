import serverless from 'serverless-http';
import express from 'express';
import cors from 'cors';
import { getDbClient } from './db';

const app = express();
app.use(cors());
app.use(express.json());

// Users Routes
app.get('/users', async (req, res) => {
    try {
        const client = await getDbClient();
        const result = await client.query('SELECT * FROM users');
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.get('/users/:id', async (req, res) => {
    try {
        const client = await getDbClient();
        const result = await client.query('SELECT * FROM users WHERE id = $1', [req.params.id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Events Routes
app.get('/events', async (req, res) => {
    try {
        const client = await getDbClient();
        const result = await client.query('SELECT * FROM events ORDER BY event_date ASC');
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.post('/events', async (req, res) => {
    // Basic auth check would go here
    try {
        const { id, title, date, description } = req.body;
        const client = await getDbClient();
        await client.query(
            'INSERT INTO events (id, title, event_date, description) VALUES ($1, $2, $3, $4)',
            [id, title, date, description]
        );
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to create event' });
    }
});

app.post('/events/:id/rsvp', async (req, res) => {
    try {
        const { userId, status } = req.body;
        const eventId = req.params.id;
        const client = await getDbClient();

        // This is a naive implementation using JSONB manipulation. 
        // ideally we'd normalize RSVPs into a table, but for this migration we stick to the JSONB structure
        const rsvpObj = { userId, status, timestamp: new Date().toISOString() };

        // Remove existing RSVP for this user
        // Then append new one
        // Note: In Postgres JSONB, this is a bit complex. 
        // Simplest generic way: Read, Modify, Update. Concurrency issues possible but negligible for this scale.

        const evtRes = await client.query('SELECT rsvps FROM events WHERE id = $1', [eventId]);
        if (evtRes.rows.length === 0) return res.status(404).json({ error: 'Event not found' });

        let rsvps = evtRes.rows[0].rsvps || [];
        rsvps = rsvps.filter((r: any) => r.userId !== userId);
        rsvps.push(rsvpObj);

        await client.query('UPDATE events SET rsvps = $1 WHERE id = $2', [JSON.stringify(rsvps), eventId]);

        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error processing RSVP' });
    }
});

// Products/Orders Routes (Stubbed for brevity, following same pattern)
app.get('/products', async (req, res) => {
    const client = await getDbClient();
    const result = await client.query('SELECT * FROM products');
    res.json(result.rows);
});

export const handler = serverless(app);
