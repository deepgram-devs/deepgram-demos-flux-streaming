const http = require('http');
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');

const PORT = 3000;
const WS_PORT = 3001;

// Get API key from environment variable
const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY;

if (!DEEPGRAM_API_KEY) {
  console.error('❌ DEEPGRAM_API_KEY environment variable is required!');
  console.log('💡 Set it with: export DEEPGRAM_API_KEY="your_api_key_here"');
  process.exit(1);
}

const server = http.createServer((req, res) => {
  // Simple static file server
  let filePath = path.join(__dirname, req.url === '/' ? 'index.html' : req.url);

  // Security check - only serve files in current directory
  if (!filePath.startsWith(__dirname)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404);
        res.end('File not found');
      } else {
        res.writeHead(500);
        res.end('Server error');
      }
      return;
    }

    // Set content type based on file extension
    const ext = path.extname(filePath).toLowerCase();
    const contentTypes = {
      '.html': 'text/html',
      '.js': 'application/javascript',
      '.css': 'text/css',
      '.json': 'application/json',
    };

    res.writeHead(200, {
      'Content-Type': contentTypes[ext] || 'text/plain',
      'Access-Control-Allow-Origin': '*' // Allow CORS for development
    });
    res.end(data);
  });
});

// WebSocket proxy server
const wsServer = new WebSocket.Server({ port: WS_PORT });

wsServer.on('connection', (clientWs, req) => {
  console.log('🔌 Client connected to WebSocket proxy');

  // Extract query parameters from the client request
  const url = new URL(req.url, `http://localhost:${WS_PORT}`);
  const searchParams = url.searchParams;

  // Build Deepgram WebSocket URL with client parameters
  const deepgramUrl = `wss://api.preview.deepgram.com/v2/listen?${searchParams.toString()}`;

  console.log(`🎯 Connecting to Deepgram: ${deepgramUrl}`);

  // Create connection to Deepgram with proper authentication
  const deepgramWs = new WebSocket(deepgramUrl, {
    headers: {
      'Authorization': `Token ${DEEPGRAM_API_KEY}`
    }
  });

  // Forward messages from client to Deepgram
  clientWs.on('message', (data) => {
    if (deepgramWs.readyState === WebSocket.OPEN) {
      deepgramWs.send(data);
    }
  });

  // Forward messages from Deepgram to client
  deepgramWs.on('message', (data) => {
    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.send(data);
    }
  });

  // Handle Deepgram connection events
  deepgramWs.on('open', () => {
    console.log('✅ Connected to Deepgram FLUX API');
  });

  deepgramWs.on('error', (error) => {
    console.error('❌ Deepgram connection error:', error.message);
    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.close(1000, `Deepgram error: ${error.message}`);
    }
  });

  deepgramWs.on('close', (code, reason) => {
    console.log(`🔌 Deepgram connection closed: ${code} - ${reason}`);
    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.close(code, reason);
    }
  });

  // Handle client disconnection
  clientWs.on('close', () => {
    console.log('🔌 Client disconnected');
    if (deepgramWs.readyState === WebSocket.OPEN) {
      deepgramWs.close();
    }
  });

  clientWs.on('error', (error) => {
    console.error('❌ Client connection error:', error.message);
    if (deepgramWs.readyState === WebSocket.OPEN) {
      deepgramWs.close();
    }
  });
});

server.listen(PORT, () => {
  console.log(`🚀 FLUX Demo server running at http://localhost:${PORT}`);
  console.log(`🔌 WebSocket proxy running on port ${WS_PORT}`);
  console.log('📝 Open the URL in your browser to test the FLUX API');
  console.log(`🔑 Using API key: ${DEEPGRAM_API_KEY.substring(0, 8)}...`);
});
