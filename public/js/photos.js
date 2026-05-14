/**
 * KipinQ — Photos Module
 * Handles: photo upload (drag & drop + click), gallery grid, lightbox,
 *          and a fully-featured Create Album modal.
 */

const Photos = {
  selectedAlbumId: null,

  /* ── Palette & emoji choices for the album creator ── */
  _albumColors: [
    { id: 'violet',  label: 'Violet',    value: 'linear-gradient(135deg,#8B35D6,#5a1fa0)' },
    { id: 'pink',    label: 'Pink',      value: 'linear-gradient(135deg,#FF4D94,#c4245e)' },
    { id: 'cyan',    label: 'Cyan',      value: 'linear-gradient(135deg,#00E5FF,#0088bb)' },
    { id: 'gold',    label: 'Gold',      value: 'linear-gradient(135deg,#FFCC00,#e06000)' },
    { id: 'green',   label: 'Mint',      value: 'linear-gradient(135deg,#00FF88,#00996b)' },
    { id: 'sunset',  label: 'Sunset',    value: 'linear-gradient(135deg,#FF6B6B,#FF8E53)' },
    { id: 'ocean',   label: 'Ocean',     value: 'linear-gradient(135deg,#2980B9,#6DD5FA)' },
    { id: 'cosmos',  label: 'Cosmos',    value: 'linear-gradient(135deg,#1a0040,#8B35D6)' },
  ],
  _albumEmojis: ['📷','🌸','🏖','🎉','🌙','🌈','🔥','💫','🏔','🎭','🍃','💎','🌺','🚀','🎨','🦋'],

  /* ── Internal state for the modal ── */
  _draft: { name: '', emoji: '📷', colorId: 'violet' },

  init() {
    this.selectedAlbumId = null;
    this.renderGallery();
    this.bindUpload();
    this._injectStyles();
    this._buildModal();
  },

  /* ════════════════════════════════════════
     GALLERY
  ════════════════════════════════════════ */

  renderGallery() {
    const grid = UI.$('photos-grid');
    if (!grid) return;
    this.renderAlbumBar();

    const photos = this._filteredPhotos();
    grid.innerHTML = '';

    if (photos.length === 0) {
      grid.innerHTML = `<div style="text-align:center;color:var(--muted);padding:40px;">No photos found in this album. Upload some or create a new album.</div>`;
      return;
    }

    photos.forEach(photo => {
      grid.appendChild(this.buildThumb(photo));
    });
  },

  renderAlbumBar() {
    const bar = UI.$('photo-album-bar');
    if (!bar) return;

    const allCount = AppState.photos.length;
    const albumButtons = AppState.albums.map(album => {
      const active = this.selectedAlbumId === album.id
        ? 'background:var(--primary);color:#fff;box-shadow:0 0 12px rgba(139,53,214,.5);'
        : '';
      return `<button class="btn btn-ghost kipinq-album-pill" style="${active}" onclick="Photos.selectAlbum('${album.id}')">${album.emoji || '📁'} ${album.name}</button>`;
    }).join('');

    const selectedAlbum = AppState.albums.find(a => a.id === this.selectedAlbumId);
    const selectedCount = selectedAlbum
      ? AppState.photos.filter(p => p.albumId === selectedAlbum.id).length
      : allCount;

    bar.innerHTML = `
      <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
        <button class="btn btn-solid kipinq-album-pill${!this.selectedAlbumId ? ' kipinq-album-pill--all' : ''}"
                onclick="Photos.selectAlbum(null)">
          🖼 All Photos <span class="kipinq-pill-count">${allCount}</span>
        </button>
        ${albumButtons}
      </div>
      <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;">
        <span style="color:var(--muted);font-size:13px;">
          ${selectedAlbum
            ? `<b style="color:var(--accent2)">${selectedCount}</b> photos in "${selectedAlbum.name}"`
            : `<b style="color:var(--accent2)">${allCount}</b> photos total`}
        </span>
        <button class="btn kipinq-new-album-btn" onclick="Photos.openCreateAlbumModal()">
          <span class="kipinq-plus-icon">＋</span> New Album
        </button>
      </div>
    `;
  },

  _filteredPhotos() {
    if (!this.selectedAlbumId) return AppState.photos;
    return AppState.photos.filter(photo => photo.albumId === this.selectedAlbumId);
  },

  selectAlbum(albumId) {
    this.selectedAlbumId = albumId || null;
    this.renderGallery();
  },

  /* ════════════════════════════════════════
     CREATE ALBUM MODAL
  ════════════════════════════════════════ */

  /** Inject scoped CSS for the modal and new bar buttons */
  _injectStyles() {
    if (document.getElementById('kipinq-album-styles')) return;
    const style = document.createElement('style');
    style.id = 'kipinq-album-styles';
    style.textContent = `
      /* ── Album bar pills ── */
      .kipinq-album-pill {
        padding: 7px 14px !important;
        border-radius: 50px !important;
        font-size: 13px !important;
        font-weight: 700 !important;
        transition: all .18s ease !important;
        border: 1px solid var(--border) !important;
        white-space: nowrap;
      }
      .kipinq-album-pill:hover {
        border-color: var(--secondary) !important;
        transform: translateY(-1px);
        box-shadow: 0 4px 14px rgba(255,77,148,.25) !important;
      }
      .kipinq-album-pill--all {
        background: linear-gradient(135deg,var(--primary),var(--secondary)) !important;
        color:#fff !important;
        border-color:transparent !important;
      }
      .kipinq-pill-count {
        display:inline-flex;
        align-items:center;
        justify-content:center;
        background:rgba(255,255,255,.22);
        color:#fff;
        font-size:11px;
        font-weight:800;
        border-radius:20px;
        padding:1px 7px;
        margin-left:4px;
      }
      .kipinq-new-album-btn {
        padding: 8px 16px !important;
        border-radius: 50px !important;
        background: linear-gradient(135deg, var(--secondary), var(--primary)) !important;
        color: #fff !important;
        font-weight: 800 !important;
        font-size: 13px !important;
        border: none !important;
        box-shadow: 0 0 18px rgba(255,77,148,.4) !important;
        transition: all .18s ease !important;
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .kipinq-new-album-btn:hover {
        transform: translateY(-2px) scale(1.03);
        box-shadow: 0 0 28px rgba(255,77,148,.65) !important;
      }
      .kipinq-plus-icon {
        font-size: 17px;
        line-height: 1;
        font-weight: 300;
      }

      /* ── Modal backdrop ── */
      #kipinq-album-modal {
        position: fixed;
        inset: 0;
        z-index: 9999;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(8, 3, 22, 0.72);
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        opacity: 0;
        pointer-events: none;
        transition: opacity .25s ease;
      }
      #kipinq-album-modal.open {
        opacity: 1;
        pointer-events: all;
      }
      #kipinq-album-modal.open .kipinq-modal-card {
        transform: translateY(0) scale(1);
        opacity: 1;
      }

      /* ── Modal card ── */
      .kipinq-modal-card {
        background: linear-gradient(160deg, #1e1040 0%, #150b35 100%);
        border: 1px solid var(--border2);
        border-radius: 24px;
        width: 440px;
        max-width: calc(100vw - 32px);
        box-shadow: 0 32px 80px rgba(0,0,0,.7), 0 0 0 1px rgba(139,53,214,.3);
        transform: translateY(32px) scale(.96);
        opacity: 0;
        transition: transform .3s cubic-bezier(.34,1.4,.64,1), opacity .3s ease;
        overflow: hidden;
      }

      /* ── Modal header ── */
      .kipinq-modal-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 22px 24px 16px;
        border-bottom: 1px solid var(--border);
        background: linear-gradient(90deg, rgba(139,53,214,.18), rgba(255,77,148,.1));
      }
      .kipinq-modal-title {
        font-family: var(--font-title);
        font-size: 20px;
        letter-spacing: .5px;
        background: linear-gradient(90deg, var(--accent2), var(--secondary));
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
      }
      .kipinq-modal-close {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        border: 1px solid var(--border);
        background: var(--surface2);
        color: var(--muted);
        font-size: 16px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all .15s ease;
        flex-shrink: 0;
      }
      .kipinq-modal-close:hover {
        background: var(--danger);
        border-color: var(--danger);
        color: #fff;
        transform: rotate(90deg);
      }

      /* ── Modal body ── */
      .kipinq-modal-body { padding: 22px 24px; }

      .kipinq-field-label {
        font-size: 11px;
        font-weight: 800;
        letter-spacing: 1.2px;
        text-transform: uppercase;
        color: var(--muted);
        margin-bottom: 8px;
      }

      /* Name input */
      .kipinq-name-input {
        width: 100%;
        background: var(--surface2);
        border: 1.5px solid var(--border);
        border-radius: 12px;
        padding: 11px 14px;
        font-size: 14px;
        font-family: var(--font);
        font-weight: 700;
        color: var(--text);
        outline: none;
        transition: border-color .18s, box-shadow .18s;
        margin-bottom: 20px;
      }
      .kipinq-name-input:focus {
        border-color: var(--primary);
        box-shadow: 0 0 0 3px rgba(139,53,214,.25);
      }
      .kipinq-name-input::placeholder { color: var(--muted); font-weight: 400; }

      /* Emoji picker */
      .kipinq-emoji-grid {
        display: grid;
        grid-template-columns: repeat(8, 1fr);
        gap: 6px;
        margin-bottom: 20px;
      }
      .kipinq-emoji-btn {
        width: 38px;
        height: 38px;
        border-radius: 10px;
        border: 1.5px solid var(--border);
        background: var(--surface2);
        font-size: 18px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all .15s ease;
      }
      .kipinq-emoji-btn:hover {
        border-color: var(--secondary);
        transform: scale(1.12);
        box-shadow: 0 0 10px rgba(255,77,148,.35);
      }
      .kipinq-emoji-btn.selected {
        border-color: var(--accent);
        background: rgba(255,204,0,.15);
        box-shadow: 0 0 12px rgba(255,204,0,.4);
        transform: scale(1.1);
      }

      /* Color swatch picker */
      .kipinq-color-grid {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
        margin-bottom: 24px;
      }
      .kipinq-color-swatch {
        width: 36px;
        height: 36px;
        border-radius: 50%;
        border: 2.5px solid transparent;
        cursor: pointer;
        transition: all .18s ease;
        position: relative;
      }
      .kipinq-color-swatch:hover { transform: scale(1.15); }
      .kipinq-color-swatch.selected {
        border-color: #fff;
        box-shadow: 0 0 0 2px var(--secondary), 0 0 14px rgba(255,77,148,.5);
        transform: scale(1.15);
      }
      .kipinq-color-swatch.selected::after {
        content: '✓';
        position: absolute;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 14px;
        font-weight: 900;
        color: #fff;
        text-shadow: 0 1px 4px rgba(0,0,0,.6);
      }

      /* Preview banner */
      .kipinq-album-preview {
        border-radius: 14px;
        padding: 18px 20px;
        margin-bottom: 22px;
        display: flex;
        align-items: center;
        gap: 14px;
        border: 1px solid rgba(255,255,255,.1);
        box-shadow: 0 8px 24px rgba(0,0,0,.3);
        transition: background .3s ease;
      }
      .kipinq-preview-icon {
        font-size: 36px;
        line-height: 1;
        filter: drop-shadow(0 2px 8px rgba(0,0,0,.4));
      }
      .kipinq-preview-meta { flex: 1; min-width: 0; }
      .kipinq-preview-name {
        font-family: var(--font-title);
        font-size: 17px;
        color: #fff;
        text-shadow: 0 2px 8px rgba(0,0,0,.4);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .kipinq-preview-sub {
        font-size: 11px;
        color: rgba(255,255,255,.6);
        margin-top: 3px;
      }
      .kipinq-preview-badge {
        background: rgba(255,255,255,.2);
        color: #fff;
        font-size: 11px;
        font-weight: 800;
        padding: 3px 10px;
        border-radius: 20px;
        flex-shrink: 0;
      }

      /* ── Modal footer ── */
      .kipinq-modal-footer {
        display: flex;
        gap: 10px;
        padding: 16px 24px 22px;
        border-top: 1px solid var(--border);
      }
      .kipinq-btn-cancel {
        flex: 1;
        padding: 11px;
        border-radius: 12px;
        border: 1.5px solid var(--border);
        background: var(--surface2);
        color: var(--muted);
        font-family: var(--font);
        font-size: 13px;
        font-weight: 700;
        cursor: pointer;
        transition: all .18s ease;
      }
      .kipinq-btn-cancel:hover {
        border-color: var(--border2);
        color: var(--text);
        background: var(--surface3);
      }
      .kipinq-btn-create {
        flex: 2;
        padding: 11px;
        border-radius: 12px;
        border: none;
        background: linear-gradient(135deg, var(--primary), var(--secondary));
        color: #fff;
        font-family: var(--font-title);
        font-size: 15px;
        letter-spacing: .5px;
        cursor: pointer;
        transition: all .18s ease;
        box-shadow: 0 0 20px rgba(255,77,148,.4);
        position: relative;
        overflow: hidden;
      }
      .kipinq-btn-create:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 28px rgba(255,77,148,.6);
      }
      .kipinq-btn-create:active { transform: scale(.97); }
      .kipinq-btn-create:disabled {
        opacity: .45;
        cursor: not-allowed;
        transform: none !important;
        box-shadow: none !important;
      }
      /* Shimmer on create btn */
      .kipinq-btn-create::before {
        content: '';
        position: absolute;
        inset: 0;
        background: linear-gradient(105deg, transparent 40%, rgba(255,255,255,.22) 50%, transparent 60%);
        transform: translateX(-100%);
        transition: transform .5s ease;
      }
      .kipinq-btn-create:not(:disabled):hover::before { transform: translateX(100%); }
    `;
    document.head.appendChild(style);
  },

  /** Build the modal DOM once and cache it */
  _buildModal() {
    if (document.getElementById('kipinq-album-modal')) return;

    const modal = document.createElement('div');
    modal.id = 'kipinq-album-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'kipinq-modal-title-text');

    modal.innerHTML = `
      <div class="kipinq-modal-card">

        <!-- Header -->
        <div class="kipinq-modal-header">
          <span class="kipinq-modal-title" id="kipinq-modal-title-text">✨ Create New Album</span>
          <button class="kipinq-modal-close" id="kipinq-close-btn" aria-label="Close" title="Close">✕</button>
        </div>

        <!-- Body -->
        <div class="kipinq-modal-body">

          <!-- Live preview -->
          <div class="kipinq-album-preview" id="kipinq-preview-banner"
               style="background: ${this._albumColors[0].value}">
            <div class="kipinq-preview-icon" id="kipinq-preview-icon">📷</div>
            <div class="kipinq-preview-meta">
              <div class="kipinq-preview-name" id="kipinq-preview-name">My Album</div>
              <div class="kipinq-preview-sub">0 photos • just now</div>
            </div>
            <div class="kipinq-preview-badge">NEW</div>
          </div>

          <!-- Album name -->
          <div class="kipinq-field-label">Album Name</div>
          <input id="kipinq-album-name" class="kipinq-name-input"
                 type="text" maxlength="40"
                 placeholder="e.g. Summer Vibes 2025 🌴" autocomplete="off" />

          <!-- Emoji picker -->
          <div class="kipinq-field-label">Cover Icon</div>
          <div class="kipinq-emoji-grid" id="kipinq-emoji-grid"></div>

          <!-- Colour picker -->
          <div class="kipinq-field-label">Cover Colour</div>
          <div class="kipinq-color-grid" id="kipinq-color-grid"></div>

        </div><!-- /body -->

        <!-- Footer -->
        <div class="kipinq-modal-footer">
          <button class="kipinq-btn-cancel" id="kipinq-cancel-btn">Cancel</button>
          <button class="kipinq-btn-create" id="kipinq-create-btn" disabled>Create Album</button>
        </div>

      </div>
    `;

    document.body.appendChild(modal);
    this._populateModalPickers();
    this._bindModalEvents();
  },

  /** Fill emoji and colour grids */
  _populateModalPickers() {
    const emojiGrid  = document.getElementById('kipinq-emoji-grid');
    const colorGrid  = document.getElementById('kipinq-color-grid');

    // Emojis
    this._albumEmojis.forEach(em => {
      const btn = document.createElement('button');
      btn.className = 'kipinq-emoji-btn' + (em === this._draft.emoji ? ' selected' : '');
      btn.textContent = em;
      btn.title = em;
      btn.addEventListener('click', () => {
        this._draft.emoji = em;
        emojiGrid.querySelectorAll('.kipinq-emoji-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        this._refreshPreview();
      });
      emojiGrid.appendChild(btn);
    });

    // Colours
    this._albumColors.forEach(c => {
      const sw = document.createElement('button');
      sw.className = 'kipinq-color-swatch' + (c.id === this._draft.colorId ? ' selected' : '');
      sw.style.background = c.value;
      sw.title = c.label;
      sw.addEventListener('click', () => {
        this._draft.colorId = c.id;
        colorGrid.querySelectorAll('.kipinq-color-swatch').forEach(s => s.classList.remove('selected'));
        sw.classList.add('selected');
        this._refreshPreview();
      });
      colorGrid.appendChild(sw);
    });
  },

  /** Wire all events inside the modal */
  _bindModalEvents() {
    const modal      = document.getElementById('kipinq-album-modal');
    const nameInput  = document.getElementById('kipinq-album-name');
    const closeBtn   = document.getElementById('kipinq-close-btn');
    const cancelBtn  = document.getElementById('kipinq-cancel-btn');
    const createBtn  = document.getElementById('kipinq-create-btn');

    // Name input → live preview + enable create
    nameInput.addEventListener('input', () => {
      this._draft.name = nameInput.value.trim();
      this._refreshPreview();
      createBtn.disabled = this._draft.name.length === 0;
    });

    // Close / cancel
    closeBtn.addEventListener('click',  () => this.closeCreateAlbumModal());
    cancelBtn.addEventListener('click', () => this.closeCreateAlbumModal());

    // Click outside card
    modal.addEventListener('click', (e) => {
      if (e.target === modal) this.closeCreateAlbumModal();
    });

    // Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modal.classList.contains('open')) {
        this.closeCreateAlbumModal();
      }
    });

    // Create
    createBtn.addEventListener('click', () => this._confirmCreateAlbum());
  },

  /** Update the live preview banner */
  _refreshPreview() {
    const banner  = document.getElementById('kipinq-preview-banner');
    const icon    = document.getElementById('kipinq-preview-icon');
    const nameEl  = document.getElementById('kipinq-preview-name');

    const colorObj = this._albumColors.find(c => c.id === this._draft.colorId) || this._albumColors[0];

    if (banner)  banner.style.background = colorObj.value;
    if (icon)    icon.textContent = this._draft.emoji;
    if (nameEl)  nameEl.textContent = this._draft.name || 'My Album';
  },

  /** Actually create the album and close */
  _confirmCreateAlbum() {
    const name = this._draft.name.trim();
    if (!name) return;

    const colorObj = this._albumColors.find(c => c.id === this._draft.colorId) || this._albumColors[0];
    const id = `album-${Date.now()}`;

    AppState.albums.push({
      id,
      name,
      emoji:    this._draft.emoji,
      color:    colorObj.value,
      colorId:  colorObj.id,
      created:  Date.now(),
    });

    this.selectedAlbumId = id;
    this.renderGallery();
    UI.toast(`Album "${name}" created! ${this._draft.emoji}`, 'success');
    this.closeCreateAlbumModal();
  },

  /* ── Public API ── */

  openCreateAlbumModal() {
    // Reset draft
    this._draft = { name: '', emoji: '📷', colorId: 'violet' };

    const modal     = document.getElementById('kipinq-album-modal');
    const nameInput = document.getElementById('kipinq-album-name');
    const createBtn = document.getElementById('kipinq-create-btn');
    const emojiGrid = document.getElementById('kipinq-emoji-grid');
    const colorGrid = document.getElementById('kipinq-color-grid');

    if (!modal) return;

    // Reset UI state
    if (nameInput) { nameInput.value = ''; }
    if (createBtn) { createBtn.disabled = true; }

    // Re-select defaults in picker grids
    emojiGrid.querySelectorAll('.kipinq-emoji-btn').forEach(btn => {
      btn.classList.toggle('selected', btn.textContent === '📷');
    });
    colorGrid.querySelectorAll('.kipinq-color-swatch').forEach((sw, i) => {
      sw.classList.toggle('selected', this._albumColors[i]?.id === 'violet');
    });

    this._refreshPreview();
    modal.classList.add('open');

    // Auto-focus name input after transition
    setTimeout(() => { if (nameInput) nameInput.focus(); }, 310);
  },

  closeCreateAlbumModal() {
    const modal = document.getElementById('kipinq-album-modal');
    if (modal) modal.classList.remove('open');
  },

  /* ════════════════════════════════════════
     LEGACY shim — keeps old prompt() call working
  ════════════════════════════════════════ */
  createAlbum() {
    this.openCreateAlbumModal();
  },

  /* ════════════════════════════════════════
     THUMBNAILS & UPLOAD (unchanged)
  ════════════════════════════════════════ */

  buildThumb(photo) {
    const wrap = UI.el('div', { cls: 'photo-thumb', 'data-photo-id': photo.id });

    if (photo.src) {
      const img     = UI.el('img', { src: photo.src, alt: photo.label });
      const overlay = UI.el('div', { cls: 'photo-overlay' });

      const viewBtn   = UI.el('button', { style: 'background:rgba(255,255,255,0.15);border:1px solid rgba(255,255,255,0.3);color:#fff;border-radius:8px;padding:6px 12px;font-size:12px;font-weight:700;font-family:var(--font);cursor:pointer;', text: '🔍 View' });
      const deleteBtn = UI.el('button', { style: 'background:rgba(255,60,60,0.7);border:none;color:#fff;border-radius:8px;padding:6px 10px;font-size:12px;cursor:pointer;', text: '🗑' });

      viewBtn.addEventListener('click',   (e) => { e.stopPropagation(); this.openLightbox(photo.src, photo.label); });
      deleteBtn.addEventListener('click', (e) => { e.stopPropagation(); this.deletePhoto(photo.id); });

      overlay.append(viewBtn, deleteBtn);
      wrap.append(img, overlay);
      wrap.addEventListener('click', () => this.openLightbox(photo.src, photo.label));
    } else {
      const ph   = UI.el('div', { cls: 'photo-placeholder' });
      const icon = UI.el('div', { text: photo.emoji });
      const lbl  = UI.el('div', { style: 'font-size:11px;margin-top:6px;color:var(--muted);', text: photo.label });
      ph.style.background = photo.color;
      ph.append(icon, lbl);
      wrap.appendChild(ph);
      wrap.addEventListener('click', () => this.triggerUpload(photo.id));
    }

    return wrap;
  },

  bindUpload() {
    const zone = UI.$('upload-zone');
    if (!zone) return;

    zone.addEventListener('click', () => this.triggerUpload());

    zone.addEventListener('dragover', (e) => {
      e.preventDefault();
      zone.classList.add('drag-over');
    });

    zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));

    zone.addEventListener('drop', (e) => {
      e.preventDefault();
      zone.classList.remove('drag-over');
      const files = [...e.dataTransfer.files].filter(f => f.type.startsWith('image/'));
      if (files.length) this.processFiles(files);
    });
  },

  triggerUpload(photoId = null) {
    const inp = document.createElement('input');
    inp.type     = 'file';
    inp.accept   = 'image/*';
    inp.multiple = photoId === null;
    inp.addEventListener('change', (e) => {
      const files = [...e.target.files];
      if (files.length) this.processFiles(files, photoId);
    });
    inp.click();
  },

  processFiles(files, replaceId = null) {
    let loaded = 0;
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const src = e.target.result;
        if (replaceId !== null) {
          const existing = AppState.photos.find(p => p.id === replaceId);
          if (existing) {
            existing.src   = src;
            existing.label = file.name.replace(/\.[^.]+$/, '');
          }
        } else {
          AppState.photos.unshift({
            id:      Date.now() + loaded,
            src,
            label:   file.name.replace(/\.[^.]+$/, ''),
            emoji:   '📷',
            color:   'linear-gradient(135deg,var(--primary),var(--secondary))',
            albumId: this.selectedAlbumId || null,
          });
        }
        loaded++;
        if (loaded === files.length) {
          this.renderGallery();
          UI.toast(`${files.length} photo${files.length > 1 ? 's' : ''} uploaded! 📷`, 'success');
        }
      };
      reader.readAsDataURL(file);
    });
  },

  deletePhoto(id) {
    AppState.photos = AppState.photos.filter(p => p.id !== id);
    this.renderGallery();
    UI.toast('Photo removed.', 'info');
  },

  openLightbox(src, label = '') {
    const lb  = UI.$('lightbox');
    const img = UI.$('lightbox-img');
    const cap = UI.$('lightbox-caption');
    if (!lb || !img) return;
    img.src = src;
    if (cap) cap.textContent = label;
    lb.classList.add('open');
  },

  closeLightbox() {
    const lb = UI.$('lightbox');
    if (lb) lb.classList.remove('open');
  },
};