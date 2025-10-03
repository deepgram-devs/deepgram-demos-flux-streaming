const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');
const { URL } = require('url');

const PORT = 3000;
const BASE_PATH = process.env.NODE_ENV === 'production' ? '/flux-streaming' : '';


// Get API key from environment variable
const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY;

if (!DEEPGRAM_API_KEY) {
  console.error('❌ DEEPGRAM_API_KEY environment variable is required!');
  console.log('💡 Set it with: export DEEPGRAM_API_KEY="your_api_key_here"');
  process.exit(1);
}

// Connectivity test function for FLUX API
async function testFluxApiConnectivity() {
  const testUrl = 'api.deepgram.com';
  const port = 443; // HTTPS/WSS port

  console.log('\n🔍 Testing FLUX API Connectivity...');
  console.log(`   Target: ${testUrl}:${port}`);

  return new Promise((resolve) => {
    const startTime = Date.now();

    // Test HTTPS connectivity first
    const req = https.get(`https://${testUrl}`, {
      timeout: 5000,
      headers: {
        'User-Agent': 'Deepgram-FLUX-Demo/1.0'
      }
    }, (res) => {
      const duration = Date.now() - startTime;
      console.log(`✅ HTTPS connection successful (${duration}ms)`);
      console.log(`   Status: ${res.statusCode} ${res.statusMessage}`);
      console.log(`   Server: ${res.headers.server || 'Unknown'}`);
      resolve({ success: true, duration, statusCode: res.statusCode });
      req.destroy();
    });

    req.on('error', (err) => {
      const duration = Date.now() - startTime;
      console.log(`❌ HTTPS connection failed (${duration}ms)`);
      console.log(`   Error: ${err.code} - ${err.message}`);

      if (err.code === 'ENOTFOUND') {
        console.log('   🔍 DNS resolution failed - check internet connection');
      } else if (err.code === 'ECONNREFUSED') {
        console.log('   🔍 Connection refused - service may be down');
      } else if (err.code === 'ETIMEDOUT') {
        console.log('   🔍 Connection timeout - network issues or firewall blocking');
      }

      resolve({ success: false, error: err, duration });
    });

    req.on('timeout', () => {
      const duration = Date.now() - startTime;
      console.log(`⏰ HTTPS request timeout (${duration}ms)`);
      req.destroy();
      resolve({ success: false, error: new Error('TIMEOUT'), duration });
    });
  });
}

const server = http.createServer((req, res) => {
  // Simple static file server with base path handling
  // Parse URL to separate pathname from query parameters
  const parsedUrl = new URL(req.url, `http://localhost:${PORT}`);
  let requestPath = parsedUrl.pathname;
  if (requestPath.startsWith(BASE_PATH)) {
    requestPath = requestPath.substring(BASE_PATH.length);
  }
  // Normalize to a relative path inside the project
  let relativePath = requestPath;
  if (!relativePath || relativePath === '/') {
    relativePath = 'index.html';
  }
  if (relativePath.startsWith('/')) {
    relativePath = relativePath.slice(1);
  }
  // Simple static file server
  let filePath = path.join(__dirname, relativePath);

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

// WebSocket proxy server attached to the same HTTP server
const wsServer = new WebSocket.Server({ server });

wsServer.on('connection', async (clientWs, req) => {
  console.log('🔌 Client connected to WebSocket proxy');
  console.log(`   Client IP: ${req.socket.remoteAddress}`);
  console.log(`   User-Agent: ${req.headers['user-agent'] || 'Unknown'}`);

  // Extract query parameters from the client request
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const searchParams = url.searchParams;

  // Build Deepgram WebSocket URL with client parameters
  const deepgramUrl = `wss://api.deepgram.com/v2/listen?${searchParams.toString()}`;

  console.log(`\n🎯 Preparing FLUX API Connection:`);
  console.log(`   Full URL: ${deepgramUrl}`);
  console.log(`   Parameters: ${Array.from(searchParams.entries()).map(([k, v]) => `${k}=${v}`).join(', ')}`);
  console.log(`   API Key: ${DEEPGRAM_API_KEY.substring(0, 8)}...${DEEPGRAM_API_KEY.substring(DEEPGRAM_API_KEY.length - 4)}`);

  // Test connectivity before attempting WebSocket connection
  console.log(`\n🧪 Pre-connection connectivity test:`);
  const connectivityTest = await testFluxApiConnectivity();

  if (!connectivityTest.success) {
    console.log(`❌ Connectivity test failed - WebSocket connection likely to fail`);
    console.log(`   Closing client connection with diagnostic info`);
    clientWs.close(1002, `FLUX API connectivity test failed: ${connectivityTest.error?.message || 'Unknown error'}`);
    return;
  } else {
    console.log(`✅ Connectivity test passed - proceeding with WebSocket connection`);
  }

  console.log(`\n🚀 Attempting WebSocket connection to FLUX API...`);
  const wsStartTime = Date.now();

  // Create connection to Deepgram with proper authentication
  const deepgramWs = new WebSocket(deepgramUrl, {
    headers: {
      'Authorization': `Token ${DEEPGRAM_API_KEY}`
    }
  });

  // Forward messages from client to Deepgram
  let messageCount = 0;
  clientWs.on('message', (data) => {
    messageCount++;

    // Log first few messages and periodically thereafter
    if (messageCount <= 5 || messageCount % 50 === 0) {
      console.log(`📤 Client->Deepgram message ${messageCount}: ${data.byteLength || data.length} bytes, type: ${data.constructor.name}`);
    }

    if (deepgramWs.readyState === WebSocket.OPEN) {
      deepgramWs.send(data);
    } else {
      if (messageCount <= 3) {
        console.log(`❌ Cannot forward to Deepgram: readyState=${deepgramWs.readyState}`);
      }
    }
  });

  // Forward messages from Deepgram to client
  let responseCount = 0;
  deepgramWs.on('message', (data) => {
    responseCount++;

    // Convert data to string if it's binary
    const messageText = data.toString('utf8');

    // Log all Deepgram responses (they should be relatively infrequent)
    console.log(`📨 Deepgram response ${responseCount}: ${messageText.substring(0, 150)}${messageText.length > 150 ? '...' : ''}`);
    console.log(`🔍 Message type: ${typeof data}, constructor: ${data.constructor.name}, isBuffer: ${Buffer.isBuffer(data)}`);

    if (clientWs.readyState === WebSocket.OPEN) {
      // Send as text, not binary
      clientWs.send(messageText, { binary: false });
    } else {
      console.log(`❌ Cannot forward to client: readyState=${clientWs.readyState}`);
    }
  });

  // Handle Deepgram connection events
  deepgramWs.on('open', () => {
    const connectionTime = Date.now() - wsStartTime;
    console.log(`✅ Connected to Deepgram FLUX API successfully (${connectionTime}ms)`);
    console.log('   Protocol: WebSocket Secure (WSS)');
    console.log('   Ready State: OPEN');
    console.log('🎧 Ready to receive audio data...');
  });

  deepgramWs.on('error', (error) => {
    const connectionTime = Date.now() - wsStartTime;
    console.error(`❌ Deepgram connection error (${connectionTime}ms):`, error.message);
    console.error('🔍 Error details:', {
      code: error.code,
      message: error.message,
      type: error.constructor.name
    });

    // Provide specific troubleshooting guidance
    if (error.message.includes('401') || error.message.includes('Unauthorized')) {
      console.error('   🔑 Authentication failed - check your DEEPGRAM_API_KEY');
    } else if (error.message.includes('403') || error.message.includes('Forbidden')) {
      console.error('   🚫 Access forbidden - check API key permissions');
    } else if (error.message.includes('ENOTFOUND')) {
      console.error('   🌐 DNS lookup failed - check internet connection');
    } else if (error.message.includes('ECONNREFUSED')) {
      console.error('   🔒 Connection refused - service may be down or blocked');
    }

    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.close(1000, `Deepgram error: ${error.message}`);
    }
  });

  deepgramWs.on('close', (code, reason) => {
    const connectionTime = Date.now() - wsStartTime;
    console.log(`🔌 Deepgram connection closed (${connectionTime}ms): ${code} - ${reason || 'No reason provided'}`);
    console.log('🔍 WebSocket close codes:');
    console.log('   1000=Normal closure, 1002=Protocol error, 1003=Unsupported data');
    console.log('   4008=Invalid request, 4009=Rate limit, 4010=Invalid model');
    console.log('   4011=Insufficient credits, 4012=Model not available');

    if (code === 4008) {
      console.log('   💡 Invalid request - check query parameters and model name');
    } else if (code === 4011) {
      console.log('   💳 Insufficient credits - check your Deepgram account balance');
    } else if (code === 4010) {
      console.log('   🤖 Invalid model - "flux-general-en" may not be available');
    }

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

server.listen(PORT, async () => {
  console.log(`🚀 FLUX Demo server running at http://localhost:${PORT}`);
  console.log(`🔌 WebSocket proxy running on port ${PORT}`);
  console.log(`🔑 Using API key: ${DEEPGRAM_API_KEY.substring(0, 8)}...${DEEPGRAM_API_KEY.substring(DEEPGRAM_API_KEY.length - 4)}`);
  console.log('📝 Open the URL in your browser to test the FLUX API');

  // Run initial connectivity test
  console.log('\n🔬 Running startup connectivity test...');
  const startupTest = await testFluxApiConnectivity();

  if (startupTest.success) {
    console.log('✅ Startup connectivity test passed - FLUX API is reachable');
    console.log(`   Response time: ${startupTest.duration}ms`);
    console.log(`   HTTP Status: ${startupTest.statusCode}`);
  } else {
    console.log('❌ Startup connectivity test failed');
    console.log('   This may indicate issues with:');
    console.log('   - Internet connection');
    console.log('   - DNS resolution');
    console.log('   - Firewall blocking HTTPS/WSS connections');
    console.log('   - Deepgram API service availability');
  }

  console.log('\n' + '='.repeat(60));
  console.log('🎯 FLUX API Target: wss://api.deepgram.com/v2/listen');
  console.log('📊 Ready to accept client connections...');
  console.log('='.repeat(60) + '\n');
});
