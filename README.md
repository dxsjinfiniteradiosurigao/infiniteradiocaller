[README.md](https://github.com/user-attachments/files/30617816/README.md)
# Radio Call-In System (Free)

Lets your Facebook/TikTok/YouTube viewers "call in" to your show from their
phone, while you (the tech) control who goes live to your DJs.

## How it works
- **Viewers** open `/caller.html`, type their name, and land in a waiting room.
- **You (admin)** open `/admin.html` — you see every waiting caller as a tile
  with live audio/video preview, and can click **Go Live** to push one
  on air, or **Remove** to kick them out.
- **DJs** open `/dj.html` and just leave it open. It shows nothing until you
  push someone live, then that caller's audio/video appears automatically.

No paid service, no media server — it's peer-to-peer WebRTC, coordinated by
this small Node.js server.

---

## Option A (recommended): Deploy free on Render.com

1. Create a free account at https://render.com (no credit card needed).
2. Put this folder in a GitHub repo (create one at github.com/new, then:
   ```
   cd callin-app
   git init
   git add .
   git commit -m "initial"
   git branch -M main
   git remote add origin YOUR_REPO_URL
   git push -u origin main
   ```
3. On Render: **New +** → **Web Service** → connect your repo.
4. Settings:
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: Free
5. Deploy. Render gives you a permanent URL like
   `https://your-app.onrender.com`.

Your links become:
- Caller link (share on Facebook/TikTok/YouTube): `https://your-app.onrender.com/caller.html`
- Admin panel (you): `https://your-app.onrender.com/admin.html`
- DJ screen (each DJ opens this): `https://your-app.onrender.com/dj.html`

**Note:** Render's free tier "sleeps" after ~15 minutes of no traffic and
takes ~30-50 seconds to wake up on the next visit. Open the admin panel
a minute or two before your show starts to wake it up, or use a free
uptime pinger (e.g. UptimeRobot) to ping it every 10 minutes during show hours.

## Option B: Run it on your own PC + a free tunnel

If you don't want to use Render at all, you can run the server directly on
your studio PC and expose it with a free tunnel:

```
npm install
npm start
```

Then in another terminal, use a free tunnel tool such as
[Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/)
or [ngrok](https://ngrok.com) (free tier) to get a public URL pointing at
`localhost:3000`. Share that tunnel URL's `/caller.html` link with viewers.

This keeps everything on your PC but means the link only works while your
PC and the tunnel are running.

---

## Notes on your network setup
- Admin PC and DJ PCs being on the same LAN is **not required** — everyone
  (viewers, you, DJs) just needs the public link from whichever hosting
  option you pick above. That actually makes things simpler and more
  reliable than trying to keep it LAN-only.
- Video is optional for callers (checkbox on the join page) — audio-only
  keeps bandwidth low, which matters most when you might have several
  callers waiting at once.
- If some callers behind strict mobile-carrier NATs fail to connect (rare,
  but possible), the fix is adding a free TURN server, e.g. a free account
  at https://www.metered.ca/tools/openrelay/ — happy to wire that in if you
  hit that issue.
