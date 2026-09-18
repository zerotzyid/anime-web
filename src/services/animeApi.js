// External API service — single point of communication with NimeKu API
const fetch = (...args) => import('node-fetch').then(m => m.default(...args));

const API_BASE = process.env.API_BASE_URL || 'https://nime-ku-nu.vercel.app';
const TIMEOUT = 15000;

async function fetchApi(path, query = {}) {
  const url = new URL(path, API_BASE);
  Object.entries(query).forEach(([k, v]) => {
    if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
  });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT);

  try {
    const res = await fetch(url.toString(), {
      signal: controller.signal,
      headers: { 'Accept': 'application/json' },
    });
    clearTimeout(timeout);

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      const err = new Error(`Upstream ${res.status}: ${body.slice(0, 200)}`);
      err.status = res.status >= 500 ? 502 : res.status;
      throw err;
    }

    return await res.json();
  } catch (err) {
    clearTimeout(timeout);
    if (err.name === 'AbortError') {
      const e = new Error('Request timeout');
      e.status = 408;
      throw e;
    }
    throw err;
  }
}

// Normalizers — keep frontend expectations consistent
function normalizeCard(item) {
  const badges = item.badges || [];
  const typeBadge = badges.find(b => b.label && /movie|tv|ova|special/i.test(b.label.label || b.label));
  const type = item.type || (typeBadge ? typeBadge.label : '');
  const cats = item.categories || [];
  const genre = cats.map(c => c.name).join(', ');
  return {
    title: item.title || 'Untitled',
    slug: item.slug || '',
    thumbnail: item.thumbnail || '',
    rating: item.rating ?? '',
    updateOn: item.updateOn || '',
    episode: item.episode || '',
    duration: item.duration || '',
    studio: item.studio || '',
    type,
    genre,
    badges: badges.map(b => b.label || b),
  };
}

function normalizeDetail(data) {
  const info = data.info || {};
  const cats = data.category || [];
  const genre = cats.map(c => c.text || c.name || c).filter(Boolean).join(', ');
  const episodes = Array.isArray(data.episodeList) ? data.episodeList : [];

  // Extract servers from players[0].servers or scriptEmbeds
  let servers = [];
  if (Array.isArray(data.players) && data.players.length > 0 && Array.isArray(data.players[0].servers)) {
    servers = data.players[0].servers.map(s => ({
      server: s.server || '',
      url: s.url || ''
    }));
  } else if (Array.isArray(data.scriptEmbeds)) {
    servers = data.scriptEmbeds.map((url, i) => ({
      server: `Server ${i + 1}`,
      url: url
    }));
  }

  return {
    slug: data.slug || '',
    title: info.title || data.title || 'Untitled',
    altTitle: info.altTitle || '',
    thumbnail: data.thumbnail || '',
    duration: info.duration || '',
    genre,
    type: (data.type && data.type[0] && data.type[0].text) || '',
    season: (data.season && data.season[0] && data.season[0].text) || '',
    subtitle: info.subtitle || '',
    credit: info.credit || '',
    synopsis: data.synopsis || '',
    episodes,
    servers,
  };
}

module.exports = {
  fetchApi,
  normalizeCard,
  normalizeDetail,
  API_BASE,
};
