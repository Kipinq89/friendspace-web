/**
 * KipinQ — Profile Module
 * Handles: render profile, edit profile, profile tabs (Posts/About/Photos/Top8),
 *          profile comments, profile song, banner customisation, badges.
 *
 * Improvements over app.js scattered logic:
 *  - Tab system: Posts | About | Photos | Top 8
 *  - Animated banner with editable colour/emoji
 *  - Profile song with animated visualiser bars
 *  - Comment likes + delete
 *  - Badge manager (add/remove custom badges)
 *  - Edit form is a sliding panel, not always-visible block
 *  - Profile view counter animation
 *  - Activity log / recent posts mini-feed on profile
 */

const Profile = {

  _editOpen: false,
  _activeTab: 'posts',

  init() {
    this.render();
    this.bindEvents();
  },

  // ─── Main render ───────────────────────────────────────────────

  render() {
    const view = document.getElementById('view-profile');
    if (!view) return;
    const u = AppState.currentUser;

    view.innerHTML = `
      <div class="pf-wrap">

        <!-- Banner -->
        <div class="pf-banner" id="pf-banner" style="background:${u.bannerGradient || 'linear-gradient(135deg,#4a0080,#FF6B9D,#FFD700)'}">
          <div class="pf-banner-fx" id="pf-banner-fx">${this._buildBannerFx()}</div>
          <button class="pf-banner-edit-btn" onclick="Profile.openBannerPicker()" title="Edit banner">🎨</button>
        </div>

        <!-- Profile card -->
        <div class="pf-card">
          <div class="pf-avatar-wrap">
            <div class="pf-avatar" id="pf-avatar">${this._buildAvatar(u)}</div>
            <div class="pf-online-dot"></div>
          </div>

          <div class="pf-info">
            <div class="pf-name" id="pf-name">${u.username || 'User'}</div>
            <div class="pf-handle" id="pf-handle">${u.handle || '@user'} · Joined ${u.joined || ''}</div>
            <div class="pf-bio" id="pf-bio">${u.bio || ''}</div>

            <div class="pf-stats">
              <div class="pf-stat" onclick="Profile.switchTab('posts')">
                <span class="pf-stat-num" id="pf-stat-posts">${u.stats.posts}</span>
                <span class="pf-stat-lbl">Posts</span>
              </div>
              <div class="pf-stat" onclick="Profile.switchTab('friends')">
                <span class="pf-stat-num" id="pf-stat-friends">${UI.fmtNum(u.stats.friends)}</span>
                <span class="pf-stat-lbl">Friends</span>
              </div>
              <div class="pf-stat">
                <span class="pf-stat-num" id="pf-stat-views">${u.stats.views}</span>
                <span class="pf-stat-lbl">Views</span>
              </div>
              <div class="pf-stat">
                <span class="pf-stat-num" id="pf-stat-groups">${u.stats.groups}</span>
                <span class="pf-stat-lbl">Groups</span>
              </div>
            </div>

            <div class="pf-badges" id="pf-badges">${this._buildBadges(u.badges)}</div>
          </div>

          <div class="pf-card-actions">
            <button class="pf-action-btn pf-edit-btn" onclick="Profile.toggleEdit()">✏️ Edit Profile</button>
            <button class="pf-action-btn pf-share-btn" onclick="Profile.shareProfile()">🔗 Share</button>
          </div>
        </div>

        <!-- Profile Song -->
        ${this._buildSongWidget(u)}

        <!-- Edit panel (hidden by default) -->
        <div class="pf-edit-panel" id="pf-edit-panel">
          ${this._buildEditForm(u)}
        </div>

        <!-- Tabs -->
        <div class="pf-tabs">
          <button class="pf-tab active" data-tab="posts"   onclick="Profile.switchTab('posts',this)">📝 Posts</button>
          <button class="pf-tab"        data-tab="about"   onclick="Profile.switchTab('about',this)">👤 About</button>
          <button class="pf-tab"        data-tab="photos"  onclick="Profile.switchTab('photos',this)">📷 Photos</button>
          <button class="pf-tab"        data-tab="top8"    onclick="Profile.switchTab('top8',this)">⭐ Top 8</button>
          <button class="pf-tab"        data-tab="comments" onclick="Profile.switchTab('comments',this)">💬 Comments</button>
        </div>

        <!-- Tab content -->
        <div class="pf-tab-content" id="pf-tab-posts">${this._buildPostsTab()}</div>
        <div class="pf-tab-content pf-tab-hidden" id="pf-tab-about">${this._buildAboutTab(u)}</div>
        <div class="pf-tab-content pf-tab-hidden" id="pf-tab-photos">${this._buildPhotosTab()}</div>
        <div class="pf-tab-content pf-tab-hidden" id="pf-tab-top8">${this._buildTop8Tab(u)}</div>
        <div class="pf-tab-content pf-tab-hidden" id="pf-tab-comments">${this._buildCommentsTab()}</div>

      </div>

      <!-- Banner picker modal -->
      <div class="pf-modal-overlay pf-hidden" id="banner-modal" onclick="Profile.closeBannerPicker()">
        <div class="pf-modal" onclick="event.stopPropagation()">
          <div class="pf-modal-title">🎨 Customise Banner</div>
          <div class="pf-banner-presets" id="banner-presets">${this._buildBannerPresets()}</div>
          <button class="btn btn-primary" style="margin-top:14px;" onclick="Profile.closeBannerPicker()">Done ✓</button>
        </div>
      </div>
    `;

    this._animateStats();
  },

  // ─── Builder helpers ────────────────────────────────────────────

  _buildAvatar(u) {
    if (u.avatar && (u.avatar.startsWith('data:') || u.avatar.startsWith('http'))) {
      return `<img src="${u.avatar}" alt="Avatar" style="width:100%;height:100%;object-fit:cover;border-radius:inherit;">`;
    }
    return u.avatar || '😎';
  },

  _buildBannerFx() {
    const symbols = ['✨','⭐','💫','🎵','💜','🌙','🔥','🌟'];
    return symbols.map(s => `<span>${s}</span>`).join('');
  },

  _buildBadges(badges = []) {
    return badges.map((b, i) => `
      <span class="pf-badge" data-index="${i}">
        ${b}
        <button class="pf-badge-remove" onclick="Profile.removeBadge(${i})" title="Remove">×</button>
      </span>
    `).join('') + `<button class="pf-badge-add" onclick="Profile.promptAddBadge()">+ Add</button>`;
  },

  _buildSongWidget(u) {
    const hasSong = u.profileSongTitle;
    return `
      <div class="pf-song-widget" id="pf-song-widget">
        <div class="pf-song-art">
          <div class="pf-song-visualiser" id="pf-song-vis">
            <span></span><span></span><span></span><span></span><span></span>
          </div>
          🎵
        </div>
        <div class="pf-song-info">
          <div class="pf-song-title" id="pf-song-title">${u.profileSongTitle || 'No profile song'}</div>
          <div class="pf-song-artist" id="pf-song-artist">${u.profileSongArtist ? u.profileSongArtist + ' · Profile Song' : 'Add a song URL below'}</div>
          <div class="pf-song-progress">
            <div class="pf-song-progress-fill" id="pf-song-pfill"></div>
          </div>
        </div>
        <button class="pf-play-btn" id="pf-play-btn" onclick="Profile.toggleSong(this)">▶</button>
      </div>
    `;
  },

  _buildEditForm(u) {
    return `
      <div class="pf-edit-inner">
        <div class="pf-edit-title">✏️ Edit Profile</div>
        <div class="pf-edit-grid">
          ${this._field('Display Name', 'pf-input-name', u.username, 'text')}
          ${this._field('Handle', 'pf-input-handle', u.handle, 'text', '@username')}
          ${this._field('Status', 'pf-input-status', u.status, 'text', '💜 Single')}
          ${this._field('Location', 'pf-input-location', u.location, 'text', 'City, Country')}
          ${this._field('Mood', 'pf-input-mood', u.mood, 'text', '😎 Cool')}
          ${this._field('Fav Band', 'pf-input-band', u.band, 'text')}
          ${this._field('Zodiac', 'pf-input-zodiac', u.zodiac, 'text')}
          ${this._field('Joined', 'pf-input-joined', u.joined, 'text')}
          <div class="pf-field pf-field-wide">
            <label>Bio</label>
            <textarea id="pf-input-bio" class="input" rows="3" placeholder="Tell us about yourself...">${u.bio || ''}</textarea>
          </div>
          <div class="pf-field pf-field-wide">
            <label>Avatar (emoji or image URL)</label>
            <input id="pf-input-avatar" class="input" type="text" value="${u.avatar || ''}" placeholder="😎 or https://...">
          </div>
        </div>
        <div class="pf-edit-section-title">🎵 Profile Song</div>
        <div class="pf-edit-grid">
          ${this._field('Song Title', 'pf-input-song-title', u.profileSongTitle, 'text')}
          ${this._field('Artist', 'pf-input-song-artist', u.profileSongArtist, 'text')}
          <div class="pf-field pf-field-wide">
            <label>Audio URL (mp3/ogg/etc)</label>
            <input id="pf-input-song-url" class="input" type="text" value="${u.profileSongUrl || ''}" placeholder="https://example.com/song.mp3">
          </div>
        </div>

        <div class="pf-edit-section-title">📷 Choose Profile Picture from Gallery</div>
        <div id="pf-avatar-gallery" class="pf-avatar-gallery">${this._buildAvatarGallery()}</div>

        <div class="pf-edit-actions">
          <button class="btn btn-primary" onclick="Profile.save()">💾 Save Profile</button>
          <button class="btn btn-ghost" onclick="Profile.toggleEdit()">Cancel</button>
        </div>
      </div>
    `;
  },

  _field(label, id, value, type = 'text', placeholder = '') {
    return `
      <div class="pf-field">
        <label>${label}</label>
        <input id="${id}" class="input" type="${type}" value="${value || ''}" placeholder="${placeholder}">
      </div>
    `;
  },

  _buildAvatarGallery() {
    const photos = AppState.photos.filter(p => p.src);
    if (!photos.length) return '<div class="pf-gallery-empty">Upload photos first to pick a profile picture.</div>';
    return photos.map(p => `
      <button class="pf-gallery-choice ${AppState.currentUser.avatar === p.src ? 'selected' : ''}"
        onclick="Profile.pickAvatar('${p.id}')">
        <img src="${p.src}" alt="${p.label}">
        <span>${p.label}</span>
      </button>
    `).join('');
  },

  _buildAboutTab(u) {
    const items = [
      ['💜 Status',   u.status],
      ['📍 Location', u.location],
      ['😊 Mood',     u.mood],
      ['🎸 Fav Band', u.band],
      ['♏ Zodiac',   u.zodiac],
      ['📅 Joined',   u.joined],
    ];
    return `
      <div class="pf-about-card">
        <div class="pf-section-title">👤 About Me</div>
        <p class="pf-about-bio">${u.bio || 'No bio yet.'}</p>
        <div class="pf-about-grid">
          ${items.filter(([,v]) => v).map(([label, val]) => `
            <div class="pf-about-item">
              <span class="pf-about-label">${label}</span>
              <span class="pf-about-val">${val}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  },

  _buildPostsTab() {
    const myPosts = AppState.posts.filter(p => p.user === AppState.currentUser.username);
    if (!myPosts.length) return `<div class="pf-empty">No posts yet. Share something! ✨</div>`;
    return myPosts.map(p => `
      <div class="pf-mini-post">
        <div class="pf-mini-post-time">${p.time} · ${p.mood}</div>
        <div class="pf-mini-post-text">${p.text}</div>
        ${p.song ? `<div class="pf-mini-song">🎵 ${p.song}</div>` : ''}
        <div class="pf-mini-post-stats">💜 ${p.likes} · 💬 ${p.comments}</div>
      </div>
    `).join('');
  },

  _buildPhotosTab() {
    const photos = AppState.photos.filter(p => p.src);
    if (!photos.length) {
      return `<div class="pf-empty">No photos yet. <a href="#" onclick="UI.showView('photos');return false;">Upload some!</a></div>`;
    }
    return `
      <div class="pf-photos-grid">
        ${photos.map(p => `
          <div class="pf-photo-item" onclick="Photos.openLightbox('${p.src}','${p.label}')">
            <img src="${p.src}" alt="${p.label}">
            <div class="pf-photo-overlay">🔍</div>
          </div>
        `).join('')}
      </div>
    `;
  },

  _buildTop8Tab(u) {
    return `
      <div class="pf-section-title">⭐ My Top 8</div>
      <div class="pf-top8-grid" id="pf-top8-grid">
        ${u.top8.map((f, i) => `
          <div class="pf-top8-item" draggable="true" data-index="${i}">
            <div class="pf-top8-av" style="background:${f.gradient}">${f.emoji}</div>
            <div class="pf-top8-name">${f.name}</div>
            <button class="pf-top8-remove" onclick="Profile.removeTop8(${i})" title="Remove">×</button>
          </div>
        `).join('')}
        ${u.top8.length < 8 ? `<div class="pf-top8-add" onclick="Profile.promptAddTop8()">+ Add Friend</div>` : ''}
      </div>
      <div class="pf-top8-hint">Drag to reorder your Top 8!</div>
    `;
  },

  _buildCommentsTab() {
    const comments = AppState.profileComments || [];
    return `
      <div class="pf-comments-box">
        <div class="pf-comment-input-row">
          <div class="pf-comment-av">${AppState.currentUser.avatar?.length > 2 ? '😎' : (AppState.currentUser.avatar || '😎')}</div>
          <input class="input pf-comment-input" id="pf-comment-input" type="text"
            placeholder="Leave a comment..." onkeydown="if(event.key==='Enter')Profile.addComment()">
          <button class="send-btn" onclick="Profile.addComment()">Post</button>
        </div>
        <div id="pf-comments-list">
          ${comments.map((c, i) => this._buildComment(c, i)).join('')}
        </div>
      </div>
    `;
  },

  _buildComment(c, i) {
    return `
      <div class="pf-comment-item" id="pf-comment-${i}">
        <div class="pf-comment-av">${c.emoji}</div>
        <div class="pf-comment-body">
          <div class="pf-comment-meta">
            <span class="pf-comment-user">${c.user}</span>
            <span class="pf-comment-time">${c.time}</span>
          </div>
          <div class="pf-comment-text">${c.text}</div>
          <div class="pf-comment-actions">
            <button class="pf-comment-like" onclick="Profile.likeComment(this)">💜 <span>0</span></button>
            <button class="pf-comment-reply" onclick="Profile.replyComment(${i})">Reply</button>
            <button class="pf-comment-del" onclick="Profile.deleteComment(${i})">Delete</button>
          </div>
        </div>
      </div>
    `;
  },

  _buildBannerPresets() {
    const presets = [
      { label: 'Purple Dream',  g: 'linear-gradient(135deg,#4a0080,#FF6B9D,#FFD700)' },
      { label: 'Ocean Night',   g: 'linear-gradient(135deg,#050e1a,#1565C0,#00BCD4)' },
      { label: 'Rose Gold',     g: 'linear-gradient(135deg,#1c0a12,#c0396e,#e8a87c)' },
      { label: 'Forest',        g: 'linear-gradient(135deg,#071a09,#2e7d32,#66bb6a)' },
      { label: 'Sunset',        g: 'linear-gradient(135deg,#FF6B35,#F7C59F,#FF6B9D)' },
      { label: 'Midnight',      g: 'linear-gradient(135deg,#0d0d0d,#1a0a2e,#7B2FBE)' },
    ];
    return presets.map(p => `
      <button class="pf-banner-preset" style="background:${p.g};"
        onclick="Profile.applyBanner('${p.g}', this)" title="${p.label}">
        <span>${p.label}</span>
      </button>
    `).join('');
  },

  // ─── Tab system ────────────────────────────────────────────────

  switchTab(name, btn) {
    this._activeTab = name;
    document.querySelectorAll('.pf-tab-content').forEach(el => el.classList.add('pf-tab-hidden'));
    document.querySelectorAll('.pf-tab').forEach(b => b.classList.remove('active'));

    const target = document.getElementById(`pf-tab-${name}`);
    if (target) target.classList.remove('pf-tab-hidden');

    if (btn) {
      btn.classList.add('active');
    } else {
      const tabBtn = document.querySelector(`[data-tab="${name}"]`);
      if (tabBtn) tabBtn.classList.add('active');
    }

    // Refresh dynamic content
    if (name === 'photos') {
      const el = document.getElementById('pf-tab-photos');
      if (el) el.innerHTML = this._buildPhotosTab();
    }
    if (name === 'top8') {
      const el = document.getElementById('pf-tab-top8');
      if (el) el.innerHTML = this._buildTop8Tab(AppState.currentUser);
    }
  },

  // ─── Edit panel ────────────────────────────────────────────────

  toggleEdit() {
    this._editOpen = !this._editOpen;
    const panel = document.getElementById('pf-edit-panel');
    if (!panel) return;
    panel.classList.toggle('pf-edit-open', this._editOpen);
    const btn = document.querySelector('.pf-edit-btn');
    if (btn) btn.textContent = this._editOpen ? '✕ Close' : '✏️ Edit Profile';

    if (this._editOpen) {
      panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
      // Refresh gallery in case photos were added
      const gallery = document.getElementById('pf-avatar-gallery');
      if (gallery) gallery.innerHTML = this._buildAvatarGallery();
    }
  },

  async save() {
    const read = (id) => {
      const el = document.getElementById(id);
      return el ? el.value.trim() : '';
    };

    const updates = {
      bio:              read('pf-input-bio'),
      status:           read('pf-input-status'),
      location:         read('pf-input-location'),
      mood:             read('pf-input-mood'),
      zodiac:           read('pf-input-zodiac'),
      emoji:            read('pf-input-avatar'),
      profile_song_title:  read('pf-input-song-title'),
      profile_song_artist: read('pf-input-song-artist')
    };

    try {
      const res = await API.auth.updateProfile(updates);
      const u = res.user;
      
      // Update local state
      AppState.currentUser = { ...AppState.currentUser, ...u, avatar: u.emoji };

      // Update sidebar
      const sideUser = document.querySelector('.username');
      if (sideUser) sideUser.textContent = u.username;
      const sideMood = document.querySelector('.mood');
      if (sideMood) sideMood.textContent = u.mood;

      const sideAvatar = document.querySelector('.avatar');
      if (sideAvatar) {
        sideAvatar.innerHTML = u.emoji || '😎';
      }

      this.render();
      this._editOpen = false;
      UI.toast('Profile saved! 💾', 'success');
    } catch (err) {
      UI.toast('Failed to save profile.', 'danger');
    }
  },

  // ─── Avatar ────────────────────────────────────────────────────

  pickAvatar(photoId) {
    const photo = AppState.photos.find(p => p.id == photoId);
    if (!photo?.src) return;
    AppState.currentUser.avatar = photo.src;
    const input = document.getElementById('pf-input-avatar');
    if (input) input.value = photo.src;

    const sideAvatar = document.querySelector('.avatar');
    if (sideAvatar) {
      sideAvatar.innerHTML = `<img src="${photo.src}" alt="Avatar" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
    }

    const profileAvatar = document.getElementById('pf-avatar');
    if (profileAvatar) {
      profileAvatar.innerHTML = `<img src="${photo.src}" alt="Avatar" style="width:100%;height:100%;object-fit:cover;border-radius:inherit;">`;
    }

    // Refresh gallery highlight
    document.querySelectorAll('.pf-gallery-choice').forEach(el => el.classList.remove('selected'));
    document.querySelectorAll('.pf-gallery-choice').forEach(el => {
      if (el.querySelector('img')?.src === photo.src) el.classList.add('selected');
    });
    UI.toast('Profile picture selected! 📷', 'success');
  },

  // ─── Song ──────────────────────────────────────────────────────

  toggleSong(btn) {
    const u = AppState.currentUser;
    if (!u.profileSongUrl) {
      UI.toast('Add a profile song URL first! 🎵', 'warn');
      this.toggleEdit();
      return;
    }

    if (typeof Player === 'undefined' || !Player._audio) {
      UI.toast('Player unavailable.', 'error');
      return;
    }

    const audio = Player._audio;
    if (audio.src !== u.profileSongUrl) {
      audio.src = u.profileSongUrl;
      audio.load();
    }

    const vis = document.getElementById('pf-song-vis');

    if (audio.paused) {
      audio.play().catch(() => {
        UI.toast('Cannot play audio — check the URL.', 'error');
        btn.textContent = '▶';
      });
      btn.textContent = '⏸';
      if (vis) vis.classList.add('playing');
      this._startProgressTrack(audio);
    } else {
      audio.pause();
      btn.textContent = '▶';
      if (vis) vis.classList.remove('playing');
    }
  },

  _startProgressTrack(audio) {
    const fill = document.getElementById('pf-song-pfill');
    const tick = () => {
      if (!fill || audio.paused || !audio.duration) return;
      fill.style.width = (audio.currentTime / audio.duration * 100) + '%';
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  },

  // ─── Banner ────────────────────────────────────────────────────

  openBannerPicker() {
    const modal = document.getElementById('banner-modal');
    if (modal) modal.classList.remove('pf-hidden');
  },

  closeBannerPicker() {
    const modal = document.getElementById('banner-modal');
    if (modal) modal.classList.add('pf-hidden');
  },

  applyBanner(gradient, btn) {
    AppState.currentUser.bannerGradient = gradient;
    const banner = document.getElementById('pf-banner');
    if (banner) banner.style.background = gradient;
    document.querySelectorAll('.pf-banner-preset').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    UI.toast('Banner updated! 🎨', 'success');
  },

  // ─── Badges ────────────────────────────────────────────────────

  promptAddBadge() {
    const badge = prompt('Enter badge text (emoji + label, e.g. "🦋 Social Butterfly"):');
    if (!badge?.trim()) return;
    AppState.currentUser.badges = AppState.currentUser.badges || [];
    AppState.currentUser.badges.push(badge.trim());
    const el = document.getElementById('pf-badges');
    if (el) el.innerHTML = this._buildBadges(AppState.currentUser.badges);
    UI.toast('Badge added! ⭐', 'success');
  },

  removeBadge(index) {
    AppState.currentUser.badges.splice(index, 1);
    const el = document.getElementById('pf-badges');
    if (el) el.innerHTML = this._buildBadges(AppState.currentUser.badges);
    UI.toast('Badge removed.', 'info');
  },

  // ─── Comments ──────────────────────────────────────────────────

  addComment() {
    const input = document.getElementById('pf-comment-input');
    if (!input) return;
    const text = input.value.trim();
    if (!text) return;

    const comment = {
      user:  AppState.currentUser.username,
      emoji: '😎',
      time:  'just now',
      text,
    };

    AppState.profileComments = AppState.profileComments || [];
    AppState.profileComments.unshift(comment);

    const list = document.getElementById('pf-comments-list');
    if (list) {
      const item = document.createElement('div');
      item.innerHTML = this._buildComment(comment, 0);
      item.style.animation = 'fadeIn 0.3s ease';
      list.prepend(item.firstElementChild);
    }

    input.value = '';
    UI.toast('Comment posted! 💬', 'success');
  },

  likeComment(btn) {
    const span = btn.querySelector('span');
    const count = parseInt(span.textContent, 10);
    const liked = btn.classList.toggle('liked');
    span.textContent = liked ? count + 1 : count - 1;
    UI.pulse(btn);
  },

  replyComment(index) {
    const input = document.getElementById('pf-comment-input');
    const c = (AppState.profileComments || [])[index];
    if (input && c) {
      input.value = `@${c.user} `;
      input.focus();
    }
  },

  deleteComment(index) {
    if (!confirm('Delete this comment?')) return;
    AppState.profileComments = (AppState.profileComments || []).filter((_, i) => i !== index);
    const el = document.getElementById(`pf-comment-${index}`);
    if (el) el.remove();
    UI.toast('Comment deleted.', 'info');
  },

  // ─── Top 8 ─────────────────────────────────────────────────────

  promptAddTop8() {
    const name = prompt('Enter friend name to add to your Top 8:');
    if (!name?.trim()) return;
    const u = AppState.currentUser;
    if (u.top8.length >= 8) { UI.toast('Top 8 is full!', 'warn'); return; }
    u.top8.push({ name: name.trim(), emoji: '⭐', gradient: 'linear-gradient(135deg,#7B2FBE,#FF6B9D)' });
    const el = document.getElementById('pf-tab-top8');
    if (el) el.innerHTML = this._buildTop8Tab(u);
    UI.toast(`${name} added to Top 8! ⭐`, 'success');
  },

  removeTop8(index) {
    AppState.currentUser.top8.splice(index, 1);
    const el = document.getElementById('pf-tab-top8');
    if (el) el.innerHTML = this._buildTop8Tab(AppState.currentUser);
    UI.toast('Removed from Top 8.', 'info');
  },

  // ─── Misc ──────────────────────────────────────────────────────

  shareProfile() {
    try {
      navigator.clipboard.writeText(window.location.href);
      UI.toast('Profile link copied! 🔗', 'success');
    } catch {
      UI.toast('Profile link: ' + window.location.href, 'info');
    }
  },

  _animateStats() {
    const ids = ['pf-stat-posts', 'pf-stat-friends', 'pf-stat-views', 'pf-stat-groups'];
    ids.forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      const target = el.textContent;
      el.style.opacity = '0';
      setTimeout(() => {
        el.style.transition = 'opacity 0.4s ease';
        el.style.opacity = '1';
        el.textContent = target;
      }, 100 + Math.random() * 300);
    });
  },

  bindEvents() {
    // Re-expose globals app.js still expects
    window.renderProfile = () => this.render();
    window.saveProfile   = () => this.save();
    window.addComment    = () => this.addComment();
    window.renderProfileAvatarChoices = () => {
      const g = document.getElementById('pf-avatar-gallery');
      if (g) g.innerHTML = this._buildAvatarGallery();
    };
    window.selectProfileAvatar = (id) => this.pickAvatar(id);
    window.playProfileSong = (btn) => this.toggleSong(btn);
  },
};