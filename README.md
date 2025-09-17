# Deepgram FLUX API Demo

A simple JavaScript demo application for testing the Deepgram FLUX API - the first conversational speech recognition model designed for voice agents.

## Features

- Direct WebSocket connection to FLUX API
- Stream audio from external URLs (like radio streams)
- Real-time display of FLUX turn-based events:
  - `StartOfTurn` - User begins speaking
  - `Update` - Transcript updates
  - `Preflight` - Medium confidence turn end (optional)
  - `SpeechResumed` - Speech continues after preflight
  - `EndOfTurn` - High confidence turn end
- Configurable thresholds for turn detection
- Real-time transcript display with turn information

## Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set your Deepgram API key:**
   ```bash
   export DEEPGRAM_API_KEY="your_api_key_here"
   ```

3. **Start the local server:**
   ```bash
   npm start
   ```
   Or directly with node:
   ```bash
   node server.js
   ```

4. **Open your browser:**
   Navigate to `http://localhost:3000`

5. **Configure the demo:**
   - Use the default BBC World Service stream URL or enter your own
   - Optionally configure preflight and end-of-turn thresholds

6. **Test the FLUX API:**
   - Click "Connect to FLUX"
   - Click "Start Audio Stream" to begin streaming audio
   - Watch the real-time events and transcriptions!

## Configuration Options

### Preflight Threshold (0.2-0.9, optional)
- Leave empty to disable preflighting (simpler implementation)
- Set a value to enable early turn detection for lower latency
- Lower values = more aggressive preflighting
- Higher values = more conservative preflighting

### End-of-Turn Threshold (0.5-0.9)
- Confidence level required to trigger EndOfTurn events
- Default: 0.7
- Higher values = more confident turn detection

## Architecture

This demo uses a **WebSocket proxy server** to handle authentication:

✅ **How it works:**
- **Client** connects to local WebSocket proxy (port 3001)
- **Proxy server** authenticates with Deepgram using your API key
- **Messages flow** bidirectionally between client ↔ proxy ↔ Deepgram
- **Full FLUX API support** with proper authentication headers

✅ **Benefits:**
- **Secure:** API key stays server-side, never exposed to browser
- **Compatible:** Works with all modern browsers
- **Production-ready:** Same pattern used in real applications

## Audio Stream Requirements

- **Format:** Linear16 PCM (16-bit signed little-endian)
- **Sample Rate:** 8000, 16000, 24000, 44100, or 48000 Hz
- **Channels:** Mono only
- **Chunk Size:** 80ms recommended for optimal performance

## FLUX Events Explained

### Always Available:
- **Update:** Periodic messages with current transcript
- **StartOfTurn:** User begins speaking (trigger interruption)
- **EndOfTurn:** High confidence turn end (send to LLM)

### With Preflighting Enabled:
- **Preflight:** Medium confidence turn end (start preparing response)
- **SpeechResumed:** User continued after preflight (cancel response)

## Example Implementation Pattern

```javascript
// Simple approach - EndOfTurn only
switch(event.type) {
  case 'StartOfTurn':
    if (agentSpeaking) interruptAgent();
    break;
  case 'EndOfTurn':
    sendToLLM(transcript);
    break;
}

// Optimized approach - with preflighting
switch(event.type) {
  case 'StartOfTurn':
    if (agentSpeaking) interruptAgent();
    break;
  case 'Preflight':
    prepareResponse(transcript); // Start LLM early
    break;
  case 'SpeechResumed':
    cancelResponse(); // User still talking
    break;
  case 'EndOfTurn':
    usePreppedResponse(); // Faster response
    break;
}
```

## Testing Audio Streams

Default stream (BBC World Service):
```
http://stream.live.vc.bbcmedia.co.uk/bbc_world_service
```

Other test streams:
- NPR: `https://npr-ice.streamguys1.com/live.mp3`
- Classical: `http://stream.live.vc.bbcmedia.co.uk/bbc_radio_three`

## Troubleshooting

**Connection fails immediately:**
- Check your `DEEPGRAM_API_KEY` environment variable is set correctly
- Verify you have FLUX early access enabled on your Deepgram account
- Check browser console and server logs for specific error messages
- Ensure the WebSocket proxy server is running on port 3001

**No audio streaming:**
- Test the audio URL directly in your browser first
- Some streams may require CORS headers or have geographic restrictions
- Check that the stream format is compatible (many formats work, but linear16 PCM is preferred)
- Verify the stream URL is accessible from your server's location

**Server won't start:**
- Make sure you've run `npm install` to install dependencies
- Check that ports 3000 and 3001 are not in use by other applications
- Verify Node.js version is 14.0.0 or higher

## API Limits (Early Access)

- **Max connections:** 5 per account
- **Production use:** Not permitted during early access
- **Availability:** No uptime guarantees (sandbox environment)

For production use cases, contact Deepgram about the general availability timeline.
