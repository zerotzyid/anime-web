// Watch page — video player + quality switching + keyboard shortcuts
document.addEventListener('DOMContentLoaded', () => {
  const path = location.pathname;
  const match = path.match(/^\/watch\/([^/]+)\/(\d+)$/);
  if (!match) {
    showEl('error-block');
    return;
  }

  const [_, slug, episode] = match;
  const video = document.getElementById('video-player');
  const btnPlayPause = document.getElementById('btn-play-pause');
  const btnMute = document.getElementById('btn-mute');
  const btnFullscreen = document.getElementById('btn-fullscreen');
  const btnPip = document.getElementById('btn-pip');
  const btnQuality = document.getElementById('btn-quality');
  const btnCenterPlay = document.getElementById('btn-center-play');
  const seekBar = document.getElementById('seek-bar');
  const seekFill = document.getElementById('seek-fill');
  const volumeBar = document.getElementById('volume-bar');
  const timeDisplay = document.getElementById('time-display');
  const qualityMenu = document.getElementById('quality-menu');
  const episodeLabel = document.getElementById('episode-label');
  const prevEpBtn = document.getElementById('prev-ep');
  const nextEpBtn = document.getElementById('next-ep');
  const retryBtn = document.getElementById('retry-video');
  const retryWatchBtn = document.getElementById('retry-watch');

  let currentQuality = 'auto';
  let isSeeking = false;
  let hideControlsTimeout;
  let episodeList = [];
  let currentEpisode = parseInt(episode);

  // Initialize player
  initPlayer();

  // Event listeners
  btnPlayPause.addEventListener('click', togglePlay);
  btnCenterPlay.addEventListener('click', togglePlay);
  btnMute.addEventListener('click', toggleMute);
  btnFullscreen.addEventListener('click', toggleFullscreen);
  btnPip.addEventListener('click', togglePip);
  btnQuality.addEventListener('click', toggleQualityMenu);
  retryBtn.addEventListener('click', () => loadVideo(slug, currentEpisode));
  retryWatchBtn.addEventListener('click', () => location.reload());

  // Video events
  video.addEventListener('play', () => {
    btnPlayPause.textContent = '❚❚';
    btnCenterPlay.classList.add('hidden');
    hideControls();
  });
  video.addEventListener('pause', () => {
    btnPlayPause.textContent = '▶';
    btnCenterPlay.classList.remove('hidden');
    clearTimeout(hideControlsTimeout);
  });
  video.addEventListener('timeupdate', updateProgress);
  video.addEventListener('loadedmetadata', () => {
    hideEl('loading-overlay');
    updateTimeDisplay();
  });
  video.addEventListener('error', () => {
    console.error('[watch] Video error:', video.error);
    showEl('error-overlay');
  });

  // Seekbar events
  seekBar.addEventListener('input', (e) => {
    isSeeking = true;
    const percent = e.target.value;
    seekFill.style.width = `${percent}%`;
    const time = (percent / 100) * video.duration;
    timeDisplay.textContent = `${formatTime(time)} / ${formatTime(video.duration)}`;
  });
  seekBar.addEventListener('change', (e) => {
    const percent = e.target.value;
    video.currentTime = (percent / 100) * video.duration;
    isSeeking = false;
  });

  // Volume events
  volumeBar.addEventListener('input', (e) => {
    video.volume = e.target.value;
    btnMute.textContent = video.volume === 0 ? '🔇' : '🔊';
  });

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT') return;
    switch (e.key) {
      case ' ': togglePlay(); e.preventDefault(); break;
      case 'ArrowLeft': video.currentTime -= 5; break;
      case 'ArrowRight': video.currentTime += 5; break;
      case 'f': toggleFullscreen(); break;
      case 'm': toggleMute(); break;
    }
  });

  // Player wrapper events
  document.getElementById('player-wrapper').addEventListener('mousemove', () => {
    showControls();
    hideControls();
  });

  // Helper: fetch API
async function fetchApi(path, query = {}) {
  const url = new URL(path, window.location.origin);
  Object.entries(query).forEach(([k, v]) => {
    if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
  });
  const res = await fetch(url.toString());
  return res.json();
}

// Initialize player
async function initPlayer() {
  try {
    showEl('loading-overlay');
    const data = await fetchApi(`/api/anime/${slug}/streams?episode=${currentEpisode}`);
    if (!data.success) throw new Error(data.message || 'Gagal memuat episode');

    episodeList = data.data.episodes || [];
    episodeLabel.textContent = `Episode ${currentEpisode}`;
    updateEpisodeNav();
    updateEpisodeList();

    const servers = data.data.servers || [];
    if (servers.length === 0) throw new Error('Tidak ada server tersedia');

    // Try to find a working server
    let videoLoaded = false;
    for (const server of servers) {
      try {
        const extractData = await fetchApi('/api/extract', { url: server.url });
        if (extractData.success) {
          video.src = extractData.data.url;
          video.load();
          videoLoaded = true;
          break;
        }
      } catch (e) {
        console.error('[watch] Server failed:', server.url, e);
        continue;
      }
    }

    if (!videoLoaded) throw new Error('Semua server gagal');

    // Update quality options
    updateQualityOptions(servers);
    hideEl('error-block');
    showEl('watch-layout');
  } catch (err) {
    console.error('[watch] Init error:', err);
    showEl('error-block');
    hideEl('watch-layout');
  } finally {
    hideEl('loading-overlay');
  }
}

  // Toggle play/pause
  function togglePlay() {
    if (video.paused) {
      video.play().catch(e => console.error('[watch] Play error:', e));
    } else {
      video.pause();
    }
  }

  // Toggle mute
  function toggleMute() {
    video.muted = !video.muted;
    btnMute.textContent = video.muted ? '🔇' : '🔊';
  }

  // Toggle fullscreen
  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.getElementById('player-wrapper').requestFullscreen().catch(e => console.error('[watch] Fullscreen error:', e));
    } else {
      document.exitFullscreen().catch(e => console.error('[watch] Exit fullscreen error:', e));
    }
  }

  // Toggle Picture-in-Picture
  function togglePip() {
    if (document.pictureInPictureElement) {
      document.exitPictureInPicture().catch(e => console.error('[watch] Exit PiP error:', e));
    } else {
      video.requestPictureInPicture().catch(e => console.error('[watch] PiP error:', e));
    }
  }

  // Toggle quality menu
  function toggleQualityMenu() {
    qualityMenu.classList.toggle('hidden');
  }

  // Update progress bar
  function updateProgress() {
    if (isSeeking) return;
    const percent = (video.currentTime / video.duration) * 100;
    seekBar.value = percent;
    seekFill.style.width = `${percent}%`;
    updateTimeDisplay();
  }

  // Update time display
  function updateTimeDisplay() {
    timeDisplay.textContent = `${formatTime(video.currentTime)} / ${formatTime(video.duration)}`;
  }

  // Format time (HH:MM:SS or MM:SS)
  function formatTime(seconds) {
    if (isNaN(seconds)) return '00:00';
    const date = new Date(seconds * 1000);
    const hh = date.getUTCHours();
    const mm = date.getUTCMinutes();
    const ss = date.getUTCSeconds().toString().padStart(2, '0');
    return hh > 0 ? `${hh}:${mm.toString().padStart(2, '0')}:${ss}` : `${mm}:${ss}`;
  }

  // Update quality options
  function updateQualityOptions(servers) {
    const qualitySelect = document.getElementById('quality-select');
    qualitySelect.innerHTML = '';
    qualityMenu.innerHTML = '';

    servers.forEach((server, index) => {
      const label = server.server || `Server ${index + 1}`;
      const btn = document.createElement('button');
      btn.textContent = label;
      btn.dataset.url = server.url;
      btn.dataset.quality = label;
      btn.addEventListener('click', () => selectQuality(label, server.url));
      qualitySelect.appendChild(btn);

      const menuBtn = document.createElement('button');
      menuBtn.textContent = label;
      menuBtn.dataset.url = server.url;
      menuBtn.dataset.quality = label;
      menuBtn.addEventListener('click', () => {
        selectQuality(label, server.url);
        qualityMenu.classList.add('hidden');
      });
      qualityMenu.appendChild(menuBtn);
    });

    // Mark current quality
    const currentBtn = qualitySelect.querySelector(`[data-quality="${currentQuality}"]`);
    if (currentBtn) currentBtn.classList.add('active');

    const currentMenuBtn = qualityMenu.querySelector(`[data-quality="${currentQuality}"]`);
    if (currentMenuBtn) currentMenuBtn.classList.add('active');
  }

  // Select quality
  async function selectQuality(label, url) {
    try {
      showEl('loading-overlay');
      const savedTime = video.currentTime;
      const wasPaused = video.paused;

      // Try to extract direct URL
      try {
        const extractData = await fetchApi('/api/extract', { url });
        if (extractData.success) {
          video.src = extractData.data.url;
          video.load();
          currentQuality = label;
          updateQualityButtons(label);
          video.addEventListener('loadeddata', () => {
            if (savedTime > 0) video.currentTime = savedTime;
            if (wasPaused === false) video.play().catch(() => {});
            hideEl('loading-overlay');
          }, { once: true });
          return;
        }
      } catch (e) {
        console.error('[watch] Extract error, fallback to server URL', e);
      }

      // Fallback: use server URL directly
      video.src = url;
      video.load();
      currentQuality = label;
      updateQualityButtons(label);
      video.addEventListener('loadeddata', () => {
        if (savedTime > 0) video.currentTime = savedTime;
        if (wasPaused === false) video.play().catch(() => {});
        hideEl('loading-overlay');
      }, { once: true });
    } catch (err) {
      console.error('[watch] Select quality error:', err);
      hideEl('loading-overlay');
      showEl('error-overlay');
    }
  }

  // Update quality buttons
  function updateQualityButtons(label) {
    document.querySelectorAll('#quality-select button').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.quality === label);
    });
    document.querySelectorAll('#quality-menu button').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.quality === label);
    });
  }

  // Update episode navigation
  function updateEpisodeNav() {
    prevEpBtn.disabled = currentEpisode <= 1;
    nextEpBtn.disabled = currentEpisode >= episodeList.length;

    prevEpBtn.onclick = () => {
      if (currentEpisode > 1) {
        location.href = `/watch/${slug}/${currentEpisode - 1}`;
      }
    };

    nextEpBtn.onclick = () => {
      if (currentEpisode < episodeList.length) {
        location.href = `/watch/${slug}/${currentEpisode + 1}`;
      }
    };
  }

  // Update episode list
  function updateEpisodeList() {
    const sidebarEpisodes = document.getElementById('sidebar-episodes');
    sidebarEpisodes.innerHTML = '';

    episodeList.forEach((ep, index) => {
      const btn = document.createElement('button');
      btn.textContent = `Episode ${index + 1}`;
      btn.dataset.episode = index + 1;
      btn.classList.toggle('active', index + 1 === currentEpisode);
      btn.addEventListener('click', () => {
        location.href = `/watch/${slug}/${index + 1}`;
      });
      sidebarEpisodes.appendChild(btn);
    });
  }

  // Show controls
  function showControls() {
    document.querySelector('.custom-controls').style.opacity = '1';
    clearTimeout(hideControlsTimeout);
  }

  // Hide controls
  function hideControls() {
    clearTimeout(hideControlsTimeout);
    hideControlsTimeout = setTimeout(() => {
      if (!video.paused) {
        document.querySelector('.custom-controls').style.opacity = '0';
      }
    }, 3000);
  }

  // Helper: show element
  function showEl(id) {
    document.getElementById(id).classList.remove('hidden');
  }

  // Helper: hide element
  function hideEl(id) {
    document.getElementById(id).classList.add('hidden');
  }
});
