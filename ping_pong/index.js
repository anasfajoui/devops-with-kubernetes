const http = require('http');
const { Pool } = require('pg');

const requiredEnvironmentVariable = name => {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
};

const PORT = requiredEnvironmentVariable('PORT');
const pool = new Pool({
  host: requiredEnvironmentVariable('PGHOST'),
  port: Number(requiredEnvironmentVariable('PGPORT')),
  database: requiredEnvironmentVariable('PGDATABASE'),
  user: requiredEnvironmentVariable('PGUSER'),
  password: requiredEnvironmentVariable('PGPASSWORD'),
});

let databaseInitialization;

const initializeDatabase = () => {
  if (!databaseInitialization) {
    databaseInitialization = (async () => {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS ping_pong_counter (
          id SMALLINT PRIMARY KEY CHECK (id = 1),
          count BIGINT NOT NULL DEFAULT 0
        )
      `);
      await pool.query(`
        INSERT INTO ping_pong_counter (id, count)
        VALUES (1, 0)
        ON CONFLICT (id) DO NOTHING
      `);
    })().catch(error => {
      databaseInitialization = undefined;
      throw error;
    });
  }

  return databaseInitialization;
};

const handleRequest = async (req, res) => {
  if (req.method !== 'GET') {
    res.writeHead(405, { 'Content-Type': 'text/plain' });
    res.end('Method Not Allowed');
    return;
  }

  const requestPath = req.url.split('?')[0];

  if (requestPath === '/pingpong') {
    await initializeDatabase();
    const result = await pool.query(`
      UPDATE ping_pong_counter
      SET count = count + 1
      WHERE id = 1
      RETURNING count
    `);

    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end(`pong ${result.rows[0].count}`);
    return;
  }

  if (requestPath === '/pings') {
    await initializeDatabase();
    const result = await pool.query(
      'SELECT count FROM ping_pong_counter WHERE id = 1'
    );

    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end(`${result.rows[0].count}`);
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not Found');
};

const server = http.createServer((req, res) => {
  handleRequest(req, res).catch(error => {
    console.error(`Failed to process request for ${req.url}:`, error);
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('Internal Server Error');
  });
});

server.listen(PORT, () => {
  console.log(`ping-pong app listening on port ${PORT}`);
});
