const express = require('express');
const router = express.Router();
const { fetchApi, normalizeCard, normalizeDetail } = require('../services/animeApi');
const { cache } = require('../utils/cache');

// Routes — all API endpoints proxy to external API
router.get('/home', async (req, res) => {
  try {
    const page = req.query.page || 1;
    const data = await fetchApi('/api/home', { page });

    // Normalize upstream response: data is a list of anime
    const animeList = Array.isArray(data.data) ? data.data : [];

    res.json({
      success: true,
      data: {
        anime: animeList,
        page: data.page || parseInt(page) || 1,
        totalPages: data.pagination?.totalPages || 1,
      },
    });
  } catch (err) {
    console.error('[api/home]', err.message);
    res.status(err.status || 502).json({ success: false });
  }
});

router.get('/search', async (req, res) => {
  try {
    const q = req.query.q || '';
    const page = req.query.page || 1;
    const data = await fetchApi('/api/search', { q, page });
    res.json(data);
  } catch (err) {
    console.error('[api/search]', err.message);
    res.status(err.status || 502).json({ success: false });
  }
});

router.get('/genre', async (req, res) => {
  try {
    const data = await fetchApi('/api/genre');
    res.json(data);
  } catch (err) {
    console.error('[api/genre]', err.message);
    res.status(err.status || 502).json({ success: false });
  }
});

router.get('/latest', async (req, res) => {
  try {
    const page = req.query.page || 1;
    const data = await fetchApi('/api/latest', { page });
    res.json(data);
  } catch (err) {
    console.error('[api/latest]', err.message);
    res.status(err.status || 502).json({ success: false });
  }
});

router.get('/anime/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const data = await fetchApi(`/api/anime/${slug}`);

    // Normalize upstream response
    const info = data.data || data;
    const episodeList = Array.isArray(info.episodeList) ? info.episodeList : [];

    res.json({
      success: true,
      data: {
        slug: info.slug || slug,
        title: info.title || 'Untitled',
        thumbnail: info.thumbnail || '',
        synopsis: info.synopsis || '',
        episodes: episodeList,
        servers: [],
      },
    });
  } catch (err) {
    console.error('[api/anime]', err.message);
    res.status(err.status || 502).json({ success: false, message: 'Gagal memuat detail anime' });
  }
});

router.get('/anime/:slug/streams', async (req, res) => {
  try {
    const { slug } = req.params;
    const episode = parseInt(req.query.episode) || 1;
    const data = await fetchApi(`/api/anime/${slug}/streams?episode=${episode}`);

    // Normalize upstream response: extract servers from players[episode-1].servers or scriptEmbeds
    let servers = [];
    if (Array.isArray(data.players) && data.players.length > 0) {
      // Find the player for the requested episode
      const player = data.players.find(p => p.episode === episode) || data.players[0];
      if (Array.isArray(player.servers)) {
        servers = player.servers.map(s => ({
          server: s.server || '',
          url: s.url || ''
        }));
      }
    } else if (Array.isArray(data.scriptEmbeds)) {
      servers = data.scriptEmbeds.map((url, i) => ({
        server: `Server ${i + 1}`,
        url: url
      }));
    }

    res.json({ success: true, data: { servers, episode, slug } });
  } catch (err) {
    console.error('[api/streams]', err.message);
    res.status(err.status || 502).json({ success: false, message: 'Gagal memuat streams' });
  }
});

router.get('/extract', async (req, res) => {
  const url = req.query.url;
  if (!url) return res.status(400).json({ success: false, message: 'URL diperlukan' });

  // Direct proxy/extraction for dl.berkasdrive.com
  if (url.includes('dl.berkasdrive.com')) {
    try {
      const proxyRes = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Referer': 'https://dl.berkasdrive.com/',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8'
        },
        timeout: 15000
      });
      if (!proxyRes.ok) throw new Error(`Berkasdrive proxy ${proxyRes.status}`);
      const html = await proxyRes.text();
      const match = html.match(/https?:\/\/[^\s"']+\.mp4/i);
      if (match) {
        return res.json({ success: true, data: { url: match[0], type: 'video/mp4' } });
      } else {
        console.error('[api/extract/berkasdrive] Regex failed. HTML snippet:', html.slice(0, 500));
        throw new Error('Could not extract video URL from Berkasdrive page');
      }
    } catch (err) {
      console.error('[api/extract/berkasdrive]', err.message);
      return res.status(502).json({ success: false, message: 'Gagal mengekstrak video dari Berkasdrive' });
    }
  } else {
    // Original NimeKu API extract (for stordl.halahgan.com)
    try {
      const data = await fetchApi('/api/extract', { url });
      res.json(data);
    } catch (err) {
      console.error('[api/extract]', err.message);
      res.status(err.status || 502).json({ success: false, message: 'Gagal mengekstrak video' });
    }
  }
});

// Video stream proxy to bypass CORS
router.get('/proxy-video', async (req, res) => {
  const url = req.query.url;
  if (!url) return res.status(400).json({ success: false, message: 'URL video diperlukan' });

  // Dynamically determine Referer based on URL
  let referer = '';
  if (url.includes('berkasdrive.com')) referer = 'https://dl.berkasdrive.com/';
  if (url.includes('halahgan.com')) referer = 'https://stordl.halahgan.com/';

  try {
    const videoRes = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': referer,
        'Range': req.headers.range || ''
      },
      timeout: 30000 // Longer timeout for video streaming
    });

    if (!videoRes.ok && videoRes.status !== 206) {
      throw new Error(`Failed to proxy video: ${videoRes.status}`);
    }

    // Set headers
    res.status(videoRes.status);
    res.set({
      'Content-Type': videoRes.headers.get('content-type') || 'video/mp4',
      'Content-Length': videoRes.headers.get('content-length'),
      'Accept-Ranges': 'bytes',
      'Content-Range': videoRes.headers.get('content-range'),
      'Cache-Control': 'no-cache',
    });

    // Pipe body using async iteration (Node.js 24 ReadableStream compatible)
    if (videoRes.body) {
      const reader = videoRes.body.getReader();
      const pump = async () => {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            res.write(value);
          }
          res.end();
        } catch (err) {
          console.error('[proxy-video] stream error:', err.message);
          if (!res.headersSent) res.status(502).json({ success: false });
          else res.end();
        }
      };
      pump();
    }
  } catch (err) {
    console.error('[proxy-video]', err.message);
    if (!res.headersSent) res.status(502).json({ success: false });
  }
});

module.exports = router;