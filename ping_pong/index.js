const http = require('http');

const PORT = process.env.PORT || 3000;
let counter = 0;

const handleRequest = async (req, res) => {
  if (req.method !== 'GET') {
    res.writeHead(405, { 'Content-Type': 'text/plain' });
    res.end('Method Not Allowed');
    return;
  }

  const requestPath = req.url.split('?')[0];

  if (requestPath === '/pingpong') {
    counter += 1;

    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end(`pong ${counter}`);
    return;
  }

  if (requestPath === '/pings') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end(`${counter}`);
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
