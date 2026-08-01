// Shared ICE server setup. Tries to get your own dedicated TURN credentials
// from the server (see /api/turn-credentials); falls back to Google STUN +
// a public demo TURN relay if you haven't set up your own yet.
const FALLBACK_ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun.relay.metered.ca:80' },
  { urls: 'turn:relay.metered.ca:80', username: 'openrelayproject', credential: 'openrelayproject' },
  { urls: 'turn:relay.metered.ca:443', username: 'openrelayproject', credential: 'openrelayproject' },
  { urls: 'turn:relay.metered.ca:443?transport=tcp', username: 'openrelayproject', credential: 'openrelayproject' }
];

async function getRtcConfig() {
  try {
    const res = await fetch('/api/turn-credentials');
    const data = await res.json();
    if (data.iceServers && data.iceServers.length) {
      console.log('Using your own dedicated TURN servers.');
      return { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }, ...data.iceServers] };
    }
  } catch (e) { /* fall through to fallback */ }
  console.log('Using fallback public TURN relay (set up your own for better reliability - see README).');
  return { iceServers: FALLBACK_ICE_SERVERS };
}

// Resolved once per page load and reused everywhere.
const RTC_CONFIG_PROMISE = getRtcConfig();

// Human-readable connection status labels, driven by RTCPeerConnection state.
function friendlyIceStatus(state) {
  switch (state) {
    case 'new':
    case 'checking': return 'Connecting…';
    case 'connected':
    case 'completed': return 'Connected';
    case 'disconnected': return 'Reconnecting…';
    case 'failed': return 'Failed - check network';
    case 'closed': return 'Closed';
    default: return state;
  }
}
