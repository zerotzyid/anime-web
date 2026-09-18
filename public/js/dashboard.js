// Dashboard — API stats and latest anime
document.addEventListener('DOMContentLoaded', async () => {
  try {
    // Fetch homepage data for stats
    const homeRes = await fetch('/api/home?page=1');
    const homeData = await homeRes.json();
    const animeList = homeData.data?.anime || [];

    // Update stats
    document.getElementById('stat-total-anime').textContent = animeList.length;
    document.getElementById('stat-total-episodes').textContent = '-';
    document.getElementById('stat-status').textContent = 'ONLINE';
    document.getElementById('stat-status').className = 'stat-value status-ok';

    // Uptime (simple)
    const startTime = Date.now();
    setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const hours = Math.floor(elapsed / 3600);
      const mins = Math.floor((elapsed % 3600) / 60);
      document.getElementById('stat-uptime').textContent = `${hours}h ${mins}m`;
    }, 60000);

    // Render anime grid
    const animeGrid = document.getElementById('anime-grid');
    animeGrid.innerHTML = '';
    animeList.forEach(anime => {
      const card = document.createElement('a');
      card.href = `/watch/${anime.slug}/1`;
      card.className = 'anime-card';
      card.innerHTML = `
        <img src="${anime.thumbnail || '/images/placeholder.png'}" alt="${anime.title}" loading="lazy" onerror="this.src='/images/placeholder.png'">
        <div class="card-body">
          <div class="card-title">${anime.title}</div>
          <div class="card-meta">${anime.episode || ''} | ${anime.genre || ''}</div>
        </div>
      `;
      animeGrid.appendChild(card);
    });

    // Server info
    const serverRes = await fetch('/api/home?page=1');
    const serverData = await serverRes.json();
    document.getElementById('server-info').innerHTML = `
      <p><strong>Status:</strong> <span class="status-ok">Running</span></p>
      <p><strong>Port:</strong> 3474</p>
      <p><strong>Total Anime:</strong> ${animeList.length}</p>
      <p><strong>API Docs:</strong> <a href="/docs-api.html">/docs-api.html</a></p>
    `;
  } catch (err) {
    console.error('[dashboard]', err);
    document.getElementById('stat-status').textContent = 'ERROR';
    document.getElementById('stat-status').className = 'stat-value status-error';
  }
});
