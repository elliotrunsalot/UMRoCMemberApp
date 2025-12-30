import { getDbClient } from './db';

export const handler = async (event: any) => {
    console.log('Running Daily Reminder Job');

    // 1. Calculate Target Date (Today + 14 days)
    const today = new Date();
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + 14);

    // Format to YYYY-MM-DD for comparison (ignoring time for broad match)
    const targetStr = targetDate.toISOString().split('T')[0];

    try {
        const client = await getDbClient();

        // Query Events
        const query = `
            SELECT title, event_date 
            FROM events 
            WHERE date(event_date) = $1
        `;
        const res = await client.query(query, [targetStr]);

        if (res.rows.length > 0) {
            console.log(`Found ${res.rows.length} events starting on ${targetStr}`);
            for (const evt of res.rows) {
                console.log(`REMINDER: Event "${evt.title}" is happening in 14 days!`);
                // In a real app, we would query users and send SNS/SES email here.
            }
        } else {
            console.log(`No events found for ${targetStr}`);
        }

        return { statusCode: 200, body: 'Reminders processed' };

    } catch (err) {
        console.error('Error running reminders:', err);
        throw err;
    }
};
