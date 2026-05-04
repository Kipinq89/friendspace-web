/**
 * KipinQ — Music Player Module
 * Handles: now playing display, play/pause, track switching,
 *          progress updates, shuffle, repeat, volume, upload/URL support.
 */

const Player = {

  _audio: null,

  init() {
    this._audio = document.getElementById('audio-player');
    this.renderPlaylist();
    this.updateNowPlaying();
    this.bindControls();
    this.bindAudio();
    this.bindUpload();
  },

  /** Current track object */
  currentTrack() {
    return AppState.tracks.find(t => t.id === AppState.playerState.currentTrackId)
        || AppState.tracks[0];
  },

  /** Render the playlist rows */
  renderPlaylist() {
    const list = UI.$('playlist-tracks');
    if (!list) return;
    list.innerHTML = '';
    AppState.tracks.forEach((track, idx) => {
      list.appendChild(this.buildTrackRow(track, idx + 1));
    });
  },

  buildTrackRow(track, num) {
    const row = UI.el('div', {
      cls: `track-item${track.current ? ' playing' : ''}`,
      'data-track-id': track.id,
    });

    const numEl = UI.el('div', { cls: 'track-num', text: track.current ? '♪' : String(num) });
    const art = UI.el('div', { cls: 'track-art', text: track.emoji });

    const info = UI.el('div', { style: 'flex:1;overflow:hidden;' });
    const title  = UI.el('div', { cls: 'track-title', text: track.title });
    const artist = UI.el('div', { cls: 'track-artist', text: track.artist });
    info.append(title, artist);

    const dur = UI.el('div', { cls: 'track-duration', text: track.duration || '--:--' });

    const likeBtn = UI.el('button', {
      cls:  `track-like${track.liked ? ' liked' : ''}`,
      text: track.liked ? '💜' : '🤍',
    });
    likeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleTrackLike(track, likeBtn);
    });

    row.append(numEl, art, info, dur, likeBtn);
    row.addEventListener('click', () => this.selectTrack(track.id));
    return row;
  },

  /** Switch active track */
  selectTrack(id) {
    AppState.tracks.forEach(t => t.current = t.id === id);
    AppState.playerState.currentTrackId = id;
    AppState.playerState.progress = 0;
    AppState.playerState.elapsed = '0:00';

    const track = this.currentTrack();
    this.loadTrack(track);
    this.updateNowPlaying();
    this.renderPlaylist();

    if (AppState.playerState.playing && this._trackHasSource(track)) {
      this._audio.play().catch(() => {});
    }
  },

  /** Update the "Now Playing" card UI */
  updateNowPlaying() {
    const t = this.currentTrack();
    const s = AppState.playerState;

    this._setText('np-title', t.title || 'Untitled Track');
    this._setText('np-artist', this._trackHasSource(t) ? t.artist : 'No audio source');
    this._setText('np-elapsed', s.elapsed || '0:00');
    this._setText('np-total', this._formatDuration(t));
    this._setProgress(s.progress);

    const art = UI.$('np-art');
    if (art) {
      art.textContent = t.emoji || '🎵';
      art.classList.toggle('playing', s.playing && this._trackHasSource(t));
    }

    const btn = UI.$('btn-play-pause');
    if (btn) btn.textContent = s.playing ? '⏸' : '▶';
  },

  /** Bind all player control buttons */
  bindControls() {
    const bind = (id, fn) => {
      const el = UI.$(id);
      if (el) el.addEventListener('click', fn.bind(this));
    };

    bind('btn-play-pause', this.togglePlay);
    bind('btn-prev', this.prevTrack);
    bind('btn-next', this.nextTrack);
    bind('btn-shuffle', this.toggleShuffle);
    bind('btn-repeat', this.toggleRepeat);

    const vol = UI.$('volume-slider');
    if (vol) {
      vol.value = AppState.playerState.volume;
      vol.addEventListener('input', (e) => {
        AppState.playerState.volume = +e.target.value;
        if (this._audio) this._audio.volume = AppState.playerState.volume / 100;
      });
      if (this._audio) this._audio.volume = AppState.playerState.volume / 100;
    }

    const progressBar = UI.$('np-progress-bar');
    if (progressBar) {
      progressBar.addEventListener('click', (e) => {
        if (!this._audio || !this._audio.duration) return;
        const rect = progressBar.getBoundingClientRect();
        const pct = ((e.clientX - rect.left) / rect.width) * 100;
        AppState.playerState.progress = Math.round(pct);
        this._audio.currentTime = (pct / 100) * this._audio.duration;
        this._setProgress(AppState.playerState.progress);
      });
    }
  },

  togglePlay() {
    const track = this.currentTrack();
    if (!this._trackHasSource(track)) {
      UI.toast('Add a URL or upload an audio file first.', 'warn');
      return;
    }

    AppState.playerState.playing = !AppState.playerState.playing;
    if (AppState.playerState.playing) {
      this._audio.play().catch(() => {
        AppState.playerState.playing = false;
        this.updateNowPlaying();
      });
    } else {
      this._audio.pause();
    }

    this.updateNowPlaying();
  },

  nextTrack() {
    const ids = AppState.tracks.map(t => t.id);
    let idx = ids.indexOf(AppState.playerState.currentTrackId);
    if (AppState.playerState.shuffle) {
      idx = Math.floor(Math.random() * ids.length);
    } else {
      idx = (idx + 1) % ids.length;
    }
    this.selectTrack(ids[idx]);
  },

  prevTrack() {
    const ids = AppState.tracks.map(t => t.id);
    let idx = ids.indexOf(AppState.playerState.currentTrackId);
    idx = (idx - 1 + ids.length) % ids.length;
    this.selectTrack(ids[idx]);
  },

  toggleShuffle() {
    AppState.playerState.shuffle = !AppState.playerState.shuffle;
    const btn = UI.$('btn-shuffle');
    if (btn) btn.style.color = AppState.playerState.shuffle ? 'var(--secondary)' : '';
    UI.toast(AppState.playerState.shuffle ? '🔀 Shuffle on' : 'Shuffle off');
  },

  toggleRepeat() {
    AppState.playerState.repeat = !AppState.playerState.repeat;
    const btn = UI.$('btn-repeat');
    if (btn) btn.style.color = AppState.playerState.repeat ? 'var(--secondary)' : '';
    UI.toast(AppState.playerState.repeat ? '🔁 Repeat on' : 'Repeat off');
  },

  toggleTrackLike(track, btn) {
    track.liked = !track.liked;
    btn.textContent = track.liked ? '💜' : '🤍';
    btn.classList.toggle('liked', track.liked);
    UI.pulse(btn);
  },

  loadTrack(track) {
    if (!this._audio) return;
    const src = track.fileUrl || track.src;
    if (src) {
      if (this._audio.src !== src) {
        this._audio.src = src;
      }
      this._audio.load();
    } else {
      this._audio.removeAttribute('src');
    }
  },

  bindAudio() {
    if (!this._audio) return;

    this._audio.addEventListener('timeupdate', () => {
      if (!this._audio.duration || isNaN(this._audio.duration)) return;
      AppState.playerState.progress = Math.round((this._audio.currentTime / this._audio.duration) * 100);
      AppState.playerState.elapsed = this._formatTime(this._audio.currentTime);
      this._setText('np-elapsed', AppState.playerState.elapsed);
      this._setProgress(AppState.playerState.progress);
    });

    this._audio.addEventListener('ended', () => {
      if (AppState.playerState.repeat) {
        this._audio.currentTime = 0;
        this._audio.play().catch(() => {});
      } else {
        this.nextTrack();
      }
    });

    this._audio.addEventListener('loadedmetadata', () => {
      const duration = this._formatTime(this._audio.duration);
      AppState.playerState.total = duration;
      const track = this.currentTrack();
      if (track && (!track.duration || track.duration === '0:00')) {
        track.duration = duration;
      }
      this._setText('np-total', duration);
      if (AppState.playerState.playing) {
        this._audio.play().catch(() => {});
      }
    });

    this._audio.addEventListener('error', () => {
      UI.toast('Unable to load audio. Check the source URL or file.', 'error');
      AppState.playerState.playing = false;
      this.updateNowPlaying();
    });
  },

  bindUpload() {
    const fileInput = UI.$('music-file-input');
    const urlInput = UI.$('music-url-input');
    const addUrlBtn = UI.$('btn-add-url');

    if (fileInput) {
      fileInput.addEventListener('change', (event) => {
        this.addTrackFromFiles(event.target.files);
        event.target.value = '';
      });
    }

    if (addUrlBtn) {
      addUrlBtn.addEventListener('click', () => {
        this.addTrackFromUrl(urlInput?.value);
      });
    }

    if (urlInput) {
      urlInput.addEventListener('keyup', (event) => {
        if (event.key === 'Enter') {
          this.addTrackFromUrl(urlInput.value);
        }
      });
    }
  },

  addTrackFromFiles(files) {
    if (!files?.length) return;
    const added = [];
    [...files].forEach((file, index) => {
      if (!file.type.startsWith('audio/')) return;
      const blobUrl = URL.createObjectURL(file);
      const track = {
        id: Date.now() + index,
        title: file.name.replace(/\.[^/.]+$/, ''),
        artist: 'Local file',
        duration: '0:00',
        emoji: '🎧',
        liked: false,
        current: false,
        fileUrl: blobUrl,
      };
      AppState.tracks.push(track);
      added.push(track);
    });

    if (added.length) {
      UI.toast(`${added.length} audio file${added.length > 1 ? 's' : ''} added.`, 'success');
      this.renderPlaylist();
      if (!this._trackHasSource(this.currentTrack())) {
        this.selectTrack(added[0].id);
      }
    }
  },

  addTrackFromUrl(url) {
    const cleanUrl = (url || '').trim();
    if (!cleanUrl) return;
    if (!/^https?:\/\//i.test(cleanUrl)) {
      UI.toast('Use a valid http(s) audio URL.', 'warn');
      return;
    }

    const title = decodeURIComponent(cleanUrl.split('/').pop().split('?')[0] || 'New Track');
    const track = {
      id: Date.now(),
      title,
      artist: 'URL source',
      duration: '0:00',
      emoji: '🌐',
      liked: false,
      current: false,
      src: cleanUrl,
    };
    AppState.tracks.push(track);
    UI.toast('Audio URL added to playlist.', 'success');
    this.renderPlaylist();
    if (!this._trackHasSource(this.currentTrack())) {
      this.selectTrack(track.id);
    }
  },

  _trackHasSource(track) {
    return Boolean(track && (track.fileUrl || track.src));
  },

  _formatTime(seconds) {
    if (!Number.isFinite(seconds)) return '0:00';
    const min = Math.floor(seconds / 60);
    const sec = String(Math.floor(seconds % 60)).padStart(2, '0');
    return `${min}:${sec}`;
  },

  _formatDuration(track) {
    if (track.duration && track.duration !== '0:00') return track.duration;
    return this._trackHasSource(track) ? '0:00' : '--:--';
  },

  _setProgress(pct) {
    const fill = UI.$('np-progress-fill');
    if (fill) fill.style.width = `${pct}%`;
  },

  _setText(id, text) {
    const el = UI.$(id);
    if (el) el.textContent = text;
  },
};