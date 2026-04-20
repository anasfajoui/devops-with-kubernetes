const http = require('http');

const PORT = process.env.PORT || 3000;
let counter = 0;

const server = http.createServer((req, res) => {
  if (req.method !== 'GET') {
    res.writeHead(405, { 'Content-Type': 'text/plain' });
    res.end('Method Not Allowed');
    return;
  }

  const path = req.url.split('?')[0];

  if (path === '/pingpong') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end(`pong ${counter}`);
    counter += 1;
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not Found');
});

server.listen(PORT, () => {
  console.log(`ping-pong app listening on port ${PORT}`);
});
