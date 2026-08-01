const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'public')));

// Fetches short-lived TURN credentials from Metered.ca using server-side
// secrets (set as environment variables on Render - never exposed to the
// browser). Falls back to an empty list if not configured; the client then
// falls back to the public demo TURN relay.
app.get('/api/turn-credentials', async (req, res) => {
  const apiKey = process.env.METERED_API_KEY;
  const subdomain = process.env.METERED_SUBDOMAIN;

  if (!apiKey || !subdomain) {
    // Tell the browser *which* env var is missing, without leaking the key itself.
    return res.json({
      iceServers: [],
      debug: {
        reason: 'missing-env-vars',
        hasApiKey: !!apiKey,
        hasSubdomain: !!subdomain
      }
    });
  }

  try {
    const url = `https://${subdomain}.metered.live/api/v1/turn/credentials?apiKey=${encodeURIComponent(apiKey)}`;
    const r = await fetch(url);
    const rawText = await r.text();

    let data;
    try {
      data = JSON.parse(rawText);
    } catch (parseErr) {
      console.error('TURN credential response was not valid JSON:', rawText.slice(0, 200));
      return res.json({
        iceServers: [],
        debug: {
          reason: 'invalid-json-response',
          httpStatus: r.status,
          bodyPreview: rawText.slice(0, 200)
        }
      });
    }

    if (!r.ok) {
      console.error('TURN credential fetch returned non-OK status:', r.status, data);
      return res.json({
        iceServers: [],
        debug: {
          reason: 'metered-api-error',
          httpStatus: r.status,
          body: data
        }
      });
    }

    if (!Array.isArray(data) || data.length === 0) {
      return res.json({
        iceServers: [],
        debug: {
          reason: 'empty-or-unexpected-response',
          httpStatus: r.status,
          body: data
        }
      });
    }

    res.json({ iceServers: data, debug: { reason: 'ok', count: data.length } });
  } catch (e) {
    console.error('TURN credential fetch failed:', e.message);
    res.json({
      iceServers: [],
      debug: { reason: 'fetch-threw', message: e.message }
    });
  }
});

// ---- In-memory state (resets if server restarts - fine for a live show) ----
const callers = {};      // socketId -> { name, live }
const admins = new Set();
const djs = new Set();

function broadcastWaitingList() {
  const list = Object.entries(callers).map(([id, c]) => ({
    id, name: c.name, live: c.live
  }));
  admins.forEach((a) => io.to(a).emit('waiting-list', list));
}

io.on('connection', (socket) => {
  socket.on('register', ({ role, name }) => {
    socket.data.role = role;
    socket.data.name = name || 'Caller';

    if (role === 'caller') {
      callers[socket.id] = { name: socket.data.name, live: false };
      broadcastWaitingList();
    } else if (role === 'admin') {
      admins.add(socket.id);
      broadcastWaitingList();
    } else if (role === 'dj') {
      djs.add(socket.id);
    }
  });

  // Generic WebRTC signaling relay (offers, answers, ICE candidates)
  socket.on('signal', ({ to, data }) => {
    io.to(to).emit('signal', { from: socket.id, data });
  });

  // Admin puts a caller on air
  socket.on('go-live', ({ callerId }) => {
    if (!callers[callerId]) return;
    callers[callerId].live = true;
    const djIds = Array.from(djs);
    io.to(callerId).emit('start-broadcast', { djIds });
    djIds.forEach((djId) =>
      io.to(djId).emit('incoming-call', { callerId, name: callers[callerId].name })
    );
    broadcastWaitingList();
  });

  // Admin stops a live caller
  socket.on('stop-live', ({ callerId }) => {
    if (!callers[callerId]) return;
    callers[callerId].live = false;
    const djIds = Array.from(djs);
    io.to(callerId).emit('stop-broadcast', { djIds });
    djIds.forEach((djId) => io.to(djId).emit('call-ended', { callerId }));
    broadcastWaitingList();
  });

  // Admin removes/kicks a waiting caller
  socket.on('remove-caller', ({ callerId }) => {
    io.to(callerId).emit('kicked');
    delete callers[callerId];
    broadcastWaitingList();
  });

  // Admin sends a message to everyone waiting/live
  socket.on('broadcast-message', ({ text }) => {
    Object.keys(callers).forEach((id) => io.to(id).emit('host-message', { text }));
  });

  // Admin sends a private message to one caller
  socket.on('private-message', ({ callerId, text }) => {
    if (!callers[callerId]) return;
    io.to(callerId).emit('host-message', { text, private: true });
  });

  // Admin remotely mutes/unmutes a caller's mic or camera
  socket.on('set-caller-media', ({ callerId, audio, video }) => {
    if (!callers[callerId]) return;
    io.to(callerId).emit('media-control', { audio, video });
  });

  // Admin renames/labels a caller
  socket.on('rename-caller', ({ callerId, name }) => {
    if (!callers[callerId] || !name) return;
    callers[callerId].name = name;
    broadcastWaitingList();
  });

  socket.on('disconnect', () => {
    if (socket.data.role === 'caller') {
      const wasLive = callers[socket.id] && callers[socket.id].live;
      delete callers[socket.id];
      if (wasLive) {
        djs.forEach((djId) => io.to(djId).emit('call-ended', { callerId: socket.id }));
      }
      broadcastWaitingList();
    } else if (socket.data.role === 'admin') {
      admins.delete(socket.id);
    } else if (socket.data.role === 'dj') {
      djs.delete(socket.id);
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log('Radio call-in server running on port ' + PORT));
