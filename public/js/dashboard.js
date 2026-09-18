// Dashboard — API stats and latest anime
document.addEventListener('DOMContentLoaded', async () => {
  const API_BASE_URL = window.location.origin;

  try {
    // Fetch homepage data for stats
    const homeRes = await fetch(`${API_BASE_URL}/api/home?page=1`);
    const homeData = await homeRes.json();
    const animeList = homeData.data?.anime || [];

    document.getElementById('stat-anime-count').textContent = animeList.length;
    document.getElementById('stat-last-updated').textContent = 'Just now'; // Placeholder

    // Display latest anime in grid
    const animeGrid = document.getElementById('anime-grid');
    animeGrid.innerHTML = ''; // Clear previous content
    animeList.slice(0, 6).forEach(anime => {
      const card = document.createElement('a');
      card.href = `/watch/${anime.slug}/1`;
      card.className = 'anime-card';

      const img = document.createElement('img');
      img.src = anime.thumbnail;
      img.alt = anime.title;

      const title = document.createElement('h4');
      title.textContent = anime.title;

      card.appendChild(img);
      card.appendChild(title);
      animeGrid.appendChild(card);
    });

  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    document.getElementById('dashboard-error').textContent = 'Failed to load dashboard data. Please try again later.';
  }
});
