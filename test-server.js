// Simple test server to verify basic functionality
const http = require('http');

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(`
    <html>
      <head><title>PromptBuilder Test</title></head>
      <body>
        <h1>PromptBuilder is Working!</h1>
        <p>If you can see this, the basic server is running.</p>
        <p>Requested URL: ${req.url}</p>
        <p>Time: ${new Date().toISOString()}</p>
      </body>
    </html>
  `);
});

const PORT = 3001;
server.listen(PORT, () => {
  console.log(`Test server running at http://localhost:${PORT}`);
});