// Shared utilities
const API = '/api';
const CACHE_KEY = 'nime_history';
const MAX_HISTORY = 20;

function getHistory() {
  try { return JSON.parse(localStorage.getItem(CACHE_KEY) || '[]'); } catch { return []; }
}
function saveHistory(item) {
  const h = getHistory().filter(x => x.slug !== item.slug);
  h.unshift({ ...item, watchedAt: Date.now() });
  if (h.length > MAX_HISTORY) h.pop();
  localStorage.setItem(CACHE_KEY, JSON.stringify(h));
}
function getContinueWatching() {
  return getHistory().filter(x => x.episode);
}

function sanitize(str) {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

function skeletonGrid(n = 12) {
  return Array.from({length: n}, () =>
    '<div class="skeleton-card"><div class="skeleton-poster"></div><div class="skeleton-line"></div><div class="skeleton-line short"></div></div>'
  ).join('');
}

function cardHTML(c) {
  const src = c.thumbnail || '/img/placeholder.png';
  return `
    <a href="/anime/${encodeURIComponent(c.slug)}" class="anime-card">
      <img src="${sanitize(src)}" alt="${sanitize(c.title)}" loading="lazy" onerror="this.src='/img/placeholder.png'">
      <div class="card-body">
        <div class="card-title">${sanitize(c.title)}</div>
        <div class="card-meta">
          ${c.type ? `<span class="card-badge">${sanitize(c.type)}</span>` : ''}
          ${c.episode ? `<span>Ep ${sanitize(String(c.episode))}</span>` : ''}
          ${c.rating ? `<span>★ ${sanitize(String(c.rating))}</span>` : ''}
          ${c.updateOn ? `<span>${sanitize(c.updateOn)}</span>` : ''}
        </div>
      </div>
    </a>`;
}

function renderGrid(container, items) {
  if (!items.length) {
    container.innerHTML = '<p style="color:var(--text-muted)">Tidak ada hasil.</p>';
    return;
  }
  container.innerHTML = items.map(cardHTML).join('');
}

function renderPagination(container, currentPage, totalPages, fn) {
  if (totalPages <= 1) { container.innerHTML = ''; container.classList.add('hidden'); return; }
  container.classList.remove('hidden');
  let html = '';
  html += `<button ${currentPage <= 1 ? 'disabled' : ''} data-page="${currentPage - 1}">← Sebelumnya</button>`;
  for (let i = 1; i <= totalPages; i++) {
    if (totalPages > 7 && Math.abs(i - currentPage) > 2 && i !== 1 && i !== totalPages) {
      if (i === currentPage - 3 || i === currentPage + 3) html += '<span>…</span>';
      continue;
    }
    html += `<button class="${i === currentPage ? 'active' : ''}" data-page="${i}">${i}</button>`;
  }
  html += `<button ${currentPage >= totalPages ? 'disabled' : ''} data-page="${currentPage + 1}">Selanjutnya →</button>`;
  container.innerHTML = html;
  container.querySelectorAll('button[data-page]').forEach(btn => {
    btn.addEventListener('click', () => fn(parseInt(btn.dataset.page)));
  });
}

function showEl(id) { const el = document.getElementById(id); if (el) el.classList.remove('hidden'); }
function hideEl(id) { const el = document.getElementById(id); if (el) el.classList.add('hidden'); }

// Navbar hamburger
document.addEventListener('DOMContentLoaded', () => {
  const hb = document.querySelector('.hamburger');
  const nav = document.querySelector('.nav-links');
  if (hb && nav) {
    hb.addEventListener('click', () => {
      const open = nav.classList.toggle('open');
      hb.setAttribute('aria-expanded', open);
    });
    // Close menu on link click
    nav.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
      nav.classList.remove('open');
      hb.setAttribute('aria-expanded', 'false');
    }));
  }

  // Search form with debounce
  document.querySelectorAll('[data-search-form]').forEach(form => {
    const input = form.querySelector('input[name="q"]');
    let timer;
    input.addEventListener('input', () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        const q = input.value.trim();
        if (q) window.location.href = `/search?q=${encodeURIComponent(q)}`;
      }, 400);
    });
    form.addEventListener('submit', e => {
      e.preventDefault();
      clearTimeout(timer);
      const q = input.value.trim();
      if (q) window.location.href = `/search?q=${encodeURIComponent(q)}`;
    });
  });

  // Active nav link
  const path = location.pathname;
  document.querySelectorAll('[data-nav]').forEach(a => {
    const href = a.getAttribute('href');
    if ((href === '/' && path === '/') || (href !== '/' && path.startsWith(href))) {
      a.classList.add('active');
    }
  });
});

// Fetch helper with error mapping
async function apiFetch(url) {
  const res = await fetch(url);
  const json = await res.json();
  if (!res.ok || json.success === false) {
    const err = new Error(json.message || 'Gagal');
    err.status = res.status;
    throw err;
  }
  return json;
}
