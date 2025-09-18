
# Deepgram FLUX API Demo

A simple JavaScript demo application for testing the Deepgram FLUX API - the first conversational speech recognition model designed for voice agents.

## 🎯 What is FLUX?

FLUX is Deepgram's breakthrough conversational AI model that understands **turn-taking dynamics** - not just transcribing words, but knowing when to listen, when to think, and when to speak. Perfect for building voice agents and interactive applications.

## API Preview Mode

This demo currently uses the Flux Preview URL: `wss://api.preview.deepgram.com/v2/listen.` Once Flux is GA, it will be changed to use a Production URL. 


## Demo Browser Support

This demo will run in Chrome and Safari browsers only. No Firefox support.

## ✨ Demo Features

- **🎤 Real-time microphone input** with Linear16 PCM audio processing
- **🔄 Turn-based speech recognition** optimized for conversations
- **⚡ Ultra-low latency** with model-integrated end-of-turn detection
- **🎯 Smart turn detection** with configurable confidence thresholds
- **🚀 WebSocket proxy server** with proper authentication
- **📊 Live event monitoring** with detailed FLUX response logging
- **🎨 Modern responsive UI** with real-time transcript display

### FLUX Turn-Based Events:
- **`StartOfTurn`** - User begins speaking (trigger interruption)
- **`Update`** - Real-time transcript updates during speech
- **`Preflight`** - Medium confidence turn end (start preparing response)
- **`SpeechResumed`** - Speech continues after preflight (cancel response)
- **`EndOfTurn`** - High confidence turn end (send to LLM)

## 🚀 Quick Start

### Prerequisites
- Node.js 14.0.0 or higher
- Deepgram API key with FLUX early access
- Modern browser with microphone access

### Setup

1. **Clone and install:**
   ```bash
   git clone git@github.com:deepgram-devs/deepgram-flux-demo.git
   cd deepgram-flux-demo
   npm install
   ```

2. **Set your Deepgram API key:**
   ```bash
   export DEEPGRAM_API_KEY="your_deepgram_api_key_here"
   ```

3. **Start the server:**
   ```bash
   npm start
   ```
   Or directly:
   ```bash
   node server.js
   ```

4. **Open the demo:**
   Navigate to `http://localhost:3000`

### Testing FLUX

1. **Connect**: Click "Connect to FLUX"
2. **Start microphone**: Click "🎤 Start Microphone" and grant browser permissions
3. **Speak clearly**: The app will show real-time transcription and turn events
4. **Watch the magic**: Observe FLUX's turn detection and conversational flow

## ⚙️ Configuration Options

### Preflight Threshold (0.2-0.9, optional)
- **Leave empty**: Disable preflighting for simpler implementation
- **Lower values (0.2-0.4)**: More aggressive early turn detection
- **Higher values (0.6-0.9)**: More conservative preflighting
- **Recommended**: Start with 0.6 for balanced performance

### End-of-Turn Threshold (0.5-0.9)
- **Default**: 0.7 (good balance of speed and accuracy)
- **Lower values**: Faster turn detection, more false positives
- **Higher values**: More confident detection, slightly higher latency

## 🏗️ Architecture

This demo uses a **production-ready WebSocket proxy pattern**:

```
Browser ←→ Local Proxy Server ←→ Deepgram FLUX API
```

**Why a proxy?**
- **🔐 Security**: API key stays server-side, never exposed to browser
- **🌐 Compatibility**: Works with all browsers (WebSocket auth limitations)
- **🚀 Production-ready**: Same pattern used in real voice agent applications
- **🔄 Message handling**: Proper binary/text conversion for FLUX responses

**Ports:**
- **3000**: Web interface
- **3001**: WebSocket proxy to FLUX API

## 🎵 Audio Requirements

FLUX API has **strict audio format requirements**:

- **Format**: Linear16 PCM (raw 16-bit signed little-endian)
- **Sample Rate**: 16000 Hz (16kHz)
- **Channels**: Mono only
- **Chunk Size**: 1024 samples (64ms) for optimal performance
- **Input**: Browser microphone with real-time processing

**Note**: Compressed formats (MP3, AAC, WebM) won't work with FLUX API.

## 🔧 Troubleshooting

### Connection Issues
- **Check API key**: Verify `DEEPGRAM_API_KEY` environment variable is set
- **FLUX access**: Ensure your Deepgram account has FLUX early access enabled
- **Port conflicts**: Make sure ports 3000 and 3001 are available
- **Server logs**: Check terminal for detailed connection error messages

### Microphone Issues
- **Browser permissions**: Ensure microphone access is granted
- **Audio levels**: Look for "🎵 Audio level" messages in the browser log
- **No transcripts**: Check if you see "📤 Sending chunk" messages
- **HTTPS**: Some browsers require HTTPS for microphone access

### No FLUX Responses
- **Check server logs**: Should see "📨 Deepgram response" messages
- **WebSocket connection**: Verify proxy server shows "✅ Connected to Deepgram FLUX API"
- **Audio format**: FLUX requires Linear16 PCM (handled automatically by the app)
- **Early access**: Confirm your account has FLUX API access

## 📊 What You'll See Working

When everything is working correctly, you should see:

**🖥️ Browser Interface:**
- Real-time transcript updates as you speak
- Turn Index, Current Event, and Confidence scores updating
- FLUX Events log showing JSON responses from the API
- Audio level indicators showing microphone input

**💻 Server Logs:**
- Connection success to Deepgram FLUX API
- Audio chunks being forwarded (2048 bytes each)
- FLUX responses with TurnInfo events
- Message type debugging information
