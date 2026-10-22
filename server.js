const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function initDB() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS app_state (
        org_code VARCHAR(50) PRIMARY KEY,
        data JSONB NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log("Table ready");
  } catch (err) {
    console.error("DB Init error", err);
  }
}
initDB();

app.get('/api/data/:orgCode', async (req, res) => {
  try {
    const { orgCode } = req.params;
    const result = await pool.query('SELECT data FROM app_state WHERE org_code = $1', [orgCode]);
    if (result.rows.length === 0) return res.json(null);
    res.json(result.rows[0].data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/data/:orgCode', async (req, res) => {
  try {
    const { orgCode } = req.params;
    const data = req.body;
    await pool.query(`
      INSERT INTO app_state (org_code, data, updated_at) 
      VALUES ($1, $2, CURRENT_TIMESTAMP)
      ON CONFLICT (org_code) DO UPDATE SET data = $2, updated_at = CURRENT_TIMESTAMP
    `, [orgCode, data]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
