// Genre page + Anime detail page logic
document.addEventListener('DOMContentLoaded', () => {
  const path = location.pathname;

  if (path.startsWith('/genre') && !path.includes('/anime/')) {
    loadGenrePage(path);
  } else if (path.startsWith('/anime/')) {
    loadAnimeDetail(path);
  } else if (path === '/search') {
    loadSearchPage();
  } else if (path === '/latest') {
    loadLatestPage();
  } else {
    loadHomePage();
  }
});

async function loadHomePage() {
  hideEl('skeleton-grid');
  const hero = document.getElementById('hero-section');
  const latest = document.getElementById('latest-section');
  const history = document.getElementById('history-section');
  const genre = document.getElementById('genre-section');

  // Hero + Latest
  try {
    const home = await apiFetch('/api/home?page=1');
    const items = home.data.anime || [];
    if (items.length) {
      const featured = items[0];
      hero.innerHTML = `
        <a href="/anime/${encodeURIComponent(featured.slug)}" class="hero-card">
          <img src="${sanitize(featured.thumbnail)}" alt="" loading="eager" onerror="this.style.display='none'">
          <div class="hero-info">
            <h2>${sanitize(featured.title)}</h2>
            <p>${sanitize(featured.type || '')} ${featured.episode ? '· Ep '+sanitize(String(featured.episode)) : ''}</p>
          </div>
        </a>`;
      showEl('hero-section');
    }
    if (items.length > 1) {
      latest.innerHTML = '<h2>Anime Terbaru</h2><div class="anime-grid">' + items.slice(1).map(cardHTML).join('') + '</div>';
      showEl('latest-section');
    }
  } catch (e) {
    console.error(e);
  }

  // History
  const hist = getContinueWatching();
  if (hist.length) {
    history.innerHTML = '<h2>Lanjutkan Menonton</h2><div class="anime-grid">' +
      hist.map(h => cardHTML({...h, type:'Continue'})).join('') + '</div>';
    showEl('history-section');
  }

  // Genres
  try {
    const res = await fetch('/api/genre');
    const json = await res.json();
    const genres = json.data || json.genres || [];
    if (genres.length) {
      genre.innerHTML = '<h2>Genre</h2><div class="genre-list">' +
        genres.map(g => `<a href="/genre/${encodeURIComponent(g.slug || g)}" class="genre-link">${sanitize(g.name || g)}</a>`).join('') + '</div>';
      showEl('genre-section');
    }
  } catch (e) { console.error(e); }
}

async function loadGenrePage(path) {
  hideEl('skeleton-grid');
  const grid = document.getElementById('anime-grid');
  const pag = document.getElementById('pagination');
  const err = document.getElementById('error-block');
  const titleEl = document.getElementById('page-title');

  const slug = path.replace('/genre/', '');
  titleEl.textContent = decodeURIComponent(slug);

  let page = 1;
  const load = async (p) => {
    page = p;
    try {
      const data = await apiFetch(`/api/genre/${encodeURIComponent(slug)}?page=${p}`);
      hideEl('skeleton-grid');
      showEl('anime-grid');
      renderGrid(grid, data.data || []);
      renderPagination(pag, p, data.total_pages || Math.ceil((data.data||[]).length / 12) || 1, load);
      hideEl('error-block');
    } catch (e) {
      console.error(e);
      showEl('error-block');
      hideEl('anime-grid');
    }
  };
  load(1);
}

async function loadAnimeDetail(path) {
  hideEl('skeleton-grid');
  const detail = document.getElementById('anime-detail');
  const err = document.getElementById('error-block');
  const bc = document.getElementById('breadcrumb');

  const slug = path.replace('/anime/', '');
  bc.innerHTML = `<a href="/">Home</a> → <span>${sanitize(slug)}</span>`;

  try {
    const data = await apiFetch(`/api/anime/${encodeURIComponent(slug)}`);
    const a = data.data;
    if (!a) throw new Error('Data kosong');

    document.title = `${a.title} — NIME`;

    document.getElementById('detail-poster').src = a.thumbnail || '';
    document.getElementById('detail-poster').alt = a.title;
    document.getElementById('detail-title').textContent = a.title;
    document.getElementById('detail-alt-title').textContent = a.altTitle || '';
    document.getElementById('detail-meta').innerHTML = `
      ${a.type ? `<span>${sanitize(a.type)}</span>` : ''}
      ${a.season ? `<span>${sanitize(a.season)}</span>` : ''}
      ${a.genre ? `<span>${sanitize(a.genre)}</span>` : ''}
      ${a.duration ? `<span>${sanitize(a.duration)}</span>` : ''}
    `;
    document.getElementById('detail-synopsis').textContent = a.synopsis || '';

    // Episodes
    const eps = a.episodes || [];
    const epContainer = document.getElementById('episode-list');
    if (eps.length) {
      epContainer.innerHTML = eps.map(ep =>
        `<a href="/watch/${encodeURIComponent(a.slug)}/${ep}" class="episode-btn">${ep}</a>`
      ).join('');
    } else {
      epContainer.innerHTML = '<p style="color:var(--text-muted)">Tidak ada episode.</p>';
    }

    showEl('anime-detail');
    hideEl('error-block');
  } catch (e) {
    console.error(e);
    showEl('error-block');
  }
}

async function loadSearchPage() {
  hideEl('skeleton-grid');
  const grid = document.getElementById('anime-grid');
  const q = new URLSearchParams(location.search).get('q') || '';
  document.title = `Cari "${q}" — NIME`;

  if (!q) { grid.innerHTML = '<p>Masukkan kata kunci.</p>'; return; }

  let page = 1;
  const load = async (p) => {
    page = p;
    try {
      const data = await apiFetch(`/api/search?q=${encodeURIComponent(q)}&page=${p}`);
      hideEl('skeleton-grid');
      showEl('anime-grid');
      renderGrid(grid, data.data || []);
      renderPagination(document.getElementById('pagination'), p, data.total_pages || 1, load);
      hideEl('error-block');
    } catch (e) {
      console.error(e);
      showEl('error-block');
    }
  };
  load(1);
}

async function loadLatestPage() {
  hideEl('skeleton-grid');
  const grid = document.getElementById('anime-grid');
  let page = 1;
  const load = async (p) => {
    page = p;
    try {
      const data = await apiFetch(`/api/latest?page=${p}`);
      hideEl('skeleton-grid');
      showEl('anime-grid');
      renderGrid(grid, data.data || []);
      renderPagination(document.getElementById('pagination'), p, data.total_pages || 1, load);
      hideEl('error-block');
    } catch (e) {
      console.error(e);
      showEl('error-block');
    }
  };
  load(1);
}
