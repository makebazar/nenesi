import pool from './src/server/db.ts';

async function checkVotes() {
  try {
    const users = await pool.query('SELECT * FROM users');
    console.log('Users:', users.rows);
    const votes = await pool.query('SELECT * FROM tariff_votes');
    console.log('Tariff Votes:', votes.rows);
    const sVotes = await pool.query('SELECT * FROM schedule_votes');
    console.log('Schedule Votes:', sVotes.rows);
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

checkVotes();
