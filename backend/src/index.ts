import 'dotenv/config';
import serverless from 'serverless-http';
import express from 'express';
import cors from 'cors';
import { getDbClient } from './db';
import * as AWS from 'aws-sdk';

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

app.post('/users', async (req, res) => {
    try {
        const client = await getDbClient();
        const u = req.body;
        // Basic mapping. In a real app we'd be more selective and secure.
        await client.query(
            `INSERT INTO users (id, email, password, first_name, surname, nickname, role, dob, gender, address, mobile, emergency_contact_name, emergency_contact_mobile, umnum, perm_race_num, race_history, awards, join_date, avatar)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)`,
            [
                u.id, u.email, u.password, u.firstName, u.surname, u.nickname, u.role, u.dob, u.gender, u.address, u.mobile,
                u.emergencyContactName, u.emergencyContactMobile, u.umnum, u.permRaceNum,
                JSON.stringify(u.raceHistory || []), JSON.stringify(u.awards || []), u.joinDate, u.avatar
            ]
        );
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to create user' });
    }
});

app.put('/users/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const updates = req.body;
        const client = await getDbClient();

        // Dynamic update query builder
        const fields: string[] = [];
        const values: any[] = [];
        let idx = 1;

        // Map frontend CamelCase to DB snake_case
        const map: { [key: string]: string } = {
            firstName: 'first_name', surname: 'surname', nickname: 'nickname', email: 'email',
            role: 'role', dob: 'dob', gender: 'gender', address: 'address', mobile: 'mobile',
            emergencyContactName: 'emergency_contact_name', emergencyContactMobile: 'emergency_contact_mobile',
            umnum: 'umnum', permRaceNum: 'perm_race_num', joinDate: 'join_date', avatar: 'avatar'
        };

        for (const [key, val] of Object.entries(updates)) {
            if (key === 'raceHistory' || key === 'awards') {
                fields.push(`${key === 'raceHistory' ? 'race_history' : 'awards'} = $${idx++}`);
                values.push(JSON.stringify(val)); // Ensure JSON stringified
            } else if (map[key]) {
                fields.push(`${map[key]} = $${idx++}`);
                values.push(val);
            }
        }

        if (fields.length === 0) return res.json({ success: true, message: 'No fields to update' });

        values.push(id);
        const query = `UPDATE users SET ${fields.join(', ')} WHERE id = $${idx}`;

        await client.query(query, values);
        res.json({ success: true });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to update user' });
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

// Products/Orders Routes
app.get('/products', async (req, res) => {
    const client = await getDbClient();
    const result = await client.query('SELECT * FROM products');
    res.json(result.rows);
});

app.post('/orders', async (req, res) => {
    try {
        const o = req.body;
        const client = await getDbClient();
        await client.query(
            'INSERT INTO orders (id, user_id, order_date, items, total_amount, status) VALUES ($1, $2, $3, $4, $5, $6)',
            [o.id, o.userId, o.date, JSON.stringify(o.items), o.items.reduce((sum: number, i: any) => sum + (i.price * i.qty), 0), 'pending']
        );
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to place order' });
    }
});

// Blast Messages Routes
app.get('/blast-messages', async (req, res) => {
    try {
        const client = await getDbClient();
        // Requirement: load most recent message first
        const result = await client.query('SELECT * FROM blast_messages ORDER BY date_sent DESC');
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.post('/blast-messages', async (req, res) => {
    try {
        const { id, subject, message, sent_by } = req.body;
        const client = await getDbClient();

        // 1. Save to DB
        await client.query(
            'INSERT INTO blast_messages (id, subject, message, sent_by) VALUES ($1, $2, $3, $4)',
            [id, subject, message, sent_by]
        );

        // 2. Fetch Users to Email
        const usersRes = await client.query('SELECT email, nickname FROM users WHERE role != $1', ['banned']); // Assuming 'banned' usage or just all users
        const users = usersRes.rows;

        // 3. Send Emails (Simulated/SES)
        // Check if SES is reachable via env vars (simple check)
        const ses = new AWS.SES({ region: process.env.AWS_REGION || 'us-east-1' });
        const hasAwsCreds = process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY;

        console.log(`Starting blast to ${users.length} members...`);

        for (const user of users) {
            const personalGreeting = `Hi ${user.nickname || 'Runner'},\n\n`;
            const fullBody = personalGreeting + message;

            if (hasAwsCreds) {
                try {
                    await ses.sendEmail({
                        Source: 'updates@umroc.com', // Replace with verified sender
                        Destination: { ToAddresses: [user.email] },
                        Message: {
                            Subject: { Data: subject },
                            Body: { Text: { Data: fullBody } }
                        }
                    }).promise();
                    console.log(`[SES] Sent to ${user.email}`);
                } catch (e) {
                    console.log(`[SES Error] Failed to send to ${user.email}:`, e);
                }
            } else {
                // Simulation Mode for Local Dev without AWS keys
                console.log(`\n--- SIMULATED EMAIL TO: ${user.email} ---\nSubject: ${subject}\n\n${fullBody}\n--------------------------------------`);
            }
        }

        res.json({ success: true, count: users.length, mode: hasAwsCreds ? 'live' : 'simulated' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to process blast message' });
    }
});

// Local development support
if (require.main === module) {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
}

export const handler = serverless(app);
