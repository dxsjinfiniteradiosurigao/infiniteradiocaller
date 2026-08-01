// Shared ICE server list: STUN for regular NAT, plus a free public TURN relay
// (Open Relay Project) for mobile/carrier-grade NAT where STUN alone fails.
// This is the #1 cause of "black screen, no audio" on mobile data.
const RTC_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    {
      urls: 'stun:stun.relay.metered.ca:80'
    },
    {
      urls: 'turn:relay.metered.ca:80',
      username: 'openrelayproject',
      credential: 'openrelayproject'
    },
    {
      urls: 'turn:relay.metered.ca:443',
      username: 'openrelayproject',
      credential: 'openrelayproject'
    },
    {
      urls: 'turn:relay.metered.ca:443?transport=tcp',
      username: 'openrelayproject',
      credential: 'openrelayproject'
    }
  ]
};

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
