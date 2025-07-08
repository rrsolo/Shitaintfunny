const API_KEY = "AIzaSyDlsqMzQBOW8rliC2BdpyBOV3Hs8_2bVDA";

const moods = [
  { key: 'sad', label: 'i feel sad/broken', emoji: '😢', class: 'mood-sad' },
  { key: 'redemption', label: 'i feel redemption arc', emoji: '🔥', class: 'mood-redemption' },
  { key: 'empty', label: 'i feel empty/void', emoji: '🕳️', class: 'mood-empty' },
  { key: 'cold', label: 'i feel cold/numb', emoji: '❄️', class: 'mood-cold' },
  { key: 'reflective', label: 'i feel reflective/chill', emoji: '💭', class: 'mood-reflective' },
  { key: 'chaos', label: 'i feel chaos/rage', emoji: '⚡', class: 'mood-chaos' },
  { key: 'hope', label: 'i feel hope/rebuild', emoji: '🌱', class: 'mood-hope' },
  { key: 'peace', label: 'i feel peace/recovery', emoji: '🕊️', class: 'mood-peace' },
];

const genres = [
  { key: 'rap', label: 'Rap / Trap' },
  { key: 'pop', label: 'Pop / Alternative' },
  { key: 'acoustic', label: 'Acoustic / BoyWithUke' },
  { key: 'lofi', label: 'Lo-fi / Indie Chill' },
  { key: 'rock', label: 'Rock / Retro Power × Electronic' },
];

let selectedMood = null;
let selectedGenre = null;
let playlist = [];
let currentIndex = 0;
let catalog = {};
let ytPlayer = null;
let fallbackAudio = null;
let isPlaying = false;

function saveState() {
  localStorage.setItem('splash-state', JSON.stringify({
    mood: selectedMood,
    genre: selectedGenre,
    index: currentIndex
  }));
}
function loadState() {
  const state = JSON.parse(localStorage.getItem('splash-state') || '{}');
  if (state.mood && state.genre) {
    selectedMood = state.mood;
    selectedGenre = state.genre;
    currentIndex = state.index || 0;
    return true;
  }
  return false;
}

fetch('catalog.json')
  .then(res => res.json())
  .then(data => {
    catalog = data;
    if (!loadState()) renderMoodGrid();
    else {
      playlist = shuffle([...catalog[selectedMood][selectedGenre]]);
      renderNowPlaying();
      setTimeout(playSong, 500);
    }
  });

function renderMoodGrid() {
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="mood-grid">
      ${moods.map(mood => `
        <div class="mood-tile ${mood.class}" data-mood="${mood.key}">
          <span class="emoji">${mood.emoji}</span>
          <span class="label">${mood.label}</span>
        </div>
      `).join('')}
    </div>
  `;
  document.querySelectorAll('.mood-tile').forEach(tile => {
    tile.onclick = () => {
      selectedMood = tile.dataset.mood;
      renderGenrePicker();
    };
  });
}

function renderGenrePicker() {
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="genre-picker">
      ${genres.map(genre => `
        <button class="genre-btn" data-genre="${genre.key}">
          ${genre.label}
        </button>
      `).join('')}
    </div>
  `;
  document.querySelectorAll('.genre-btn').forEach(btn => {
    btn.onclick = () => {
      selectedGenre = btn.dataset.genre;
      playlist = shuffle([...catalog[selectedMood][selectedGenre]]);
      currentIndex = 0;
      saveState();
      renderNowPlaying();
      setTimeout(playSong, 500);
    };
  });
}

function renderNowPlaying() {
  const song = playlist[currentIndex];
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="now-playing">
      <div class="song-info">
        <h2>${song.title}</h2>
        <h3>${song.artist}</h3>
      </div>
      <div class="controls">
        <button class="control-btn" id="prev" title="Previous">&#9194;</button>
        <button class="control-btn" id="play" title="Play/Pause">&#9654;</button>
        <button class="control-btn" id="next" title="Next">&#9193;</button>
      </div>
      <div id="ytplayer"></div>
      <audio id="audio-fallback" src="fallback.mp3"></audio>
    </div>
  `;
  document.getElementById('prev').onclick = prevSong;
  document.getElementById('next').onclick = nextSong;
  document.getElementById('play').onclick = togglePlayPause;
}

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function playSong() {
  const song = playlist[currentIndex];
  saveState();
  stopAll();
  // Try YouTube first
  loadYouTubePlayer(song.youtubeId, () => {
    // On error, fallback
    playFallback();
  });
}

function stopAll() {
  if (ytPlayer && ytPlayer.stopVideo) ytPlayer.stopVideo();
  if (fallbackAudio) {
    fallbackAudio.pause();
    fallbackAudio.currentTime = 0;
  }
}

function prevSong() {
  currentIndex = (currentIndex - 1 + playlist.length) % playlist.length;
  renderNowPlaying();
  setTimeout(playSong, 500);
}
function nextSong() {
  currentIndex = (currentIndex + 1) % playlist.length;
  renderNowPlaying();
  setTimeout(playSong, 500);
}
function togglePlayPause() {
  if (ytPlayer && ytPlayer.getPlayerState) {
    const state = ytPlayer.getPlayerState();
    if (state === 1) { ytPlayer.pauseVideo(); isPlaying = false; }
    else { ytPlayer.playVideo(); isPlaying = true; }
  } else if (fallbackAudio) {
    if (fallbackAudio.paused) { fallbackAudio.play(); isPlaying = true; }
    else { fallbackAudio.pause(); isPlaying = false; }
  }
}

function loadYouTubePlayer(videoId, onError) {
  // Remove old player if exists
  const ytDiv = document.getElementById('ytplayer');
  ytDiv.innerHTML = '';
  window.onYouTubeIframeAPIReady = () => {
    ytPlayer = new YT.Player('ytplayer', {
      height: '0',
      width: '0',
      videoId: videoId,
      playerVars: {
        autoplay: 1,
        controls: 0,
        modestbranding: 1,
        rel: 0,
        showinfo: 0
      },
      events: {
        onReady: (event) => {
          event.target.setVolume(100);
          event.target.playVideo();
          isPlaying = true;
        },
        onError: (event) => {
          onError();
        },
        onStateChange: (event) => {
          // 0 = ended
          if (event.data === 0) nextSong();
        }
      }
    });
  };
  if (window.YT && window.YT.Player) window.onYouTubeIframeAPIReady();
}

function playFallback() {
  fallbackAudio = document.getElementById('audio-fallback');
  fallbackAudio.currentTime = 0;
  fallbackAudio.play();
  fallbackAudio.onended = nextSong;
  isPlaying = true;
}
