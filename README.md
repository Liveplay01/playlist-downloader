# Playlist Downloader

Download your Spotify, YouTube Music, Apple Music, and Amazon Music playlists in high quality (FLAC or MP3). Self-hosted — you run it yourself, no accounts or subscriptions needed.

## How it works

- **Frontend** — React app, can be hosted on GitHub Pages (static)
- **Backend** — Node.js server that parses playlist pages (via Playwright) and downloads audio (via yt-dlp + yams.tf)
- Both talk to each other: the frontend calls your locally-running backend

---

## Option A — GitHub Pages + local backend (recommended for personal use)

### Step 1: Fork & deploy the frontend

1. Click **Fork** at the top of this page
2. In your fork, go to **Settings → Pages**
3. Under **Source**, select **GitHub Actions**
4. GitHub will automatically build and deploy the frontend on every push to `main`
5. Your frontend will be live at `https://YOUR_USERNAME.github.io/Downloader_public/`

### Step 2: Run the backend locally

You need **Node.js 22+**, **yt-dlp**, and **ffmpeg** installed on your machine.

Install system tools:

```bash
# macOS (Homebrew)
brew install yt-dlp ffmpeg

# Ubuntu/Debian
sudo apt install ffmpeg
sudo curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp
sudo chmod +x /usr/local/bin/yt-dlp

# Windows — download yt-dlp.exe and ffmpeg, add both to PATH
# https://github.com/yt-dlp/yt-dlp/releases
# https://ffmpeg.org/download.html
```

Clone the repo and start the backend:

```bash
git clone https://github.com/YOUR_USERNAME/Downloader_public
cd Downloader_public
cp .env.example .env
# Open .env and fill in your Spotify API keys (see below)
npm install
npm run dev
# Backend runs on http://localhost:4500
```

### Step 3: Connect frontend to backend

1. Open your GitHub Pages URL in the browser
2. At the bottom of the page you'll see a **Backend URL** field
3. Enter `http://localhost:4500` and press Enter
4. Done — paste a playlist link and start downloading

---

## Option B — Full Docker self-host (own server or VPS)

Run everything in one container, no separate backend needed.

```bash
git clone https://github.com/YOUR_USERNAME/Downloader_public
cd Downloader_public
cp .env.example .env
# Fill in your Spotify API keys in .env
docker compose up --build
```

Open `http://localhost:4500` — the app is fully running.

For a VPS deployment, replace `localhost` with your server's IP or domain.

---

## Getting Spotify API keys (required for Spotify playlists)

1. Go to [developer.spotify.com/dashboard](https://developer.spotify.com/dashboard)
2. Log in with your Spotify account
3. Click **Create App**
   - App name: anything (e.g. `My Downloader`)
   - Redirect URI: `http://localhost:4500`
4. Open the app → **Settings** → copy **Client ID** and **Client Secret**
5. Paste them into your `.env` file:
   ```
   SPOTIFY_CLIENT_ID=your_client_id_here
   SPOTIFY_CLIENT_SECRET=your_client_secret_here
   ```

---

## Configuration

All settings go in `.env` (copy from `.env.example`):

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `SPOTIFY_CLIENT_ID` | Yes (Spotify) | — | Spotify app Client ID |
| `SPOTIFY_CLIENT_SECRET` | Yes (Spotify) | — | Spotify app Client Secret |
| `YOUTUBE_API_KEY` | No | — | YouTube Data API key (optional, falls back to yt-dlp search) |
| `PORT` | No | `4500` | Backend port |
| `MAX_CONCURRENT_DOWNLOADS` | No | `1` | Parallel downloads (keep at 1 to avoid rate limits) |
| `DOWNLOADS_DIR` | No | `/tmp/downloads` | Temp folder for downloads |
| `FLARESOLVERR_URL` | No | — | FlareSolverr URL for Cloudflare bypass |

---

## Platform support

| Platform | Parsing | Quality |
|----------|---------|---------|
| Spotify | ✓ (API — requires keys) | FLAC / MP3 |
| YouTube Music | ✓ | MP3 |
| Apple Music | ✓ (browser scrape) | MP3 |
| Amazon Music | ✓ (browser scrape) | MP3 |

Audio is sourced from yams.tf (lossless FLAC when available) with automatic fallback to yt-dlp (high-quality MP3).

---

## Development

```bash
npm install
npm run dev        # starts both frontend (port 5173) and backend (port 4500)
```

In dev mode, the frontend proxies `/api` to `localhost:4500` automatically — no backend URL configuration needed.

---

## Legal

This software is provided for personal use. Downloading copyrighted content may violate the terms of service of streaming platforms and applicable law in your country. **You are responsible for how you use this tool.** The developers of this project are not liable for misuse.
