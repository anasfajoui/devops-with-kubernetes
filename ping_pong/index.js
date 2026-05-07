const fs = require('fs/promises');
const http = require('http');
const path = require('path');

const PORT = process.env.PORT || 3000;
const PING_PONG_COUNT_FILE =
  process.env.PING_PONG_COUNT_FILE || '/shared/ping-pong-count.txt';
let counterUpdateQueue = Promise.resolve();

const readCounter = async () => {
  try {
    const value = await fs.readFile(PING_PONG_COUNT_FILE, 'utf8');
    const parsedValue = Number.parseInt(value.trim(), 10);
    return Number.isNaN(parsedValue) ? 0 : parsedValue;
  } catch (error) {
    if (error.code === 'ENOENT') {
      return 0;
    }
    throw error;
  }
};

const writeCounter = async value => {
  await fs.mkdir(path.dirname(PING_PONG_COUNT_FILE), { recursive: true });
  await fs.writeFile(PING_PONG_COUNT_FILE, `${value}\n`, 'utf8');
};

const handleRequest = async (req, res) => {
  if (req.method !== 'GET') {
    res.writeHead(405, { 'Content-Type': 'text/plain' });
    res.end('Method Not Allowed');
    return;
  }

  const requestPath = req.url.split('?')[0];

  if (requestPath === '/pingpong') {
    const counterUpdate = counterUpdateQueue.then(async () => {
      const counter = await readCounter();
      const nextCounter = counter + 1;
      await writeCounter(nextCounter);
      return nextCounter;
    });
    counterUpdateQueue = counterUpdate.catch(() => {});
    const counter = await counterUpdate;

    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end(`pong ${counter}`);
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
  console.log(
    `ping-pong app listening on port ${PORT}, counter file: ${PING_PONG_COUNT_FILE}`
  );
});
