/**
 * FriendSpace — Photos Module
 * Handles: photo upload (drag & drop + click), gallery grid, lightbox.
 */

const Photos = {

  init() {
    this.renderGallery();
    this.bindUpload();
  },

  /** Render photo thumbnails */
  renderGallery() {
    const grid = UI.$('photos-grid');
    if (!grid) return;
    grid.innerHTML = '';
    AppState.photos.forEach(photo => {
      grid.appendChild(this.buildThumb(photo));
    });
  },

  /** Build a single thumbnail card */
  buildThumb(photo) {
    const wrap = UI.el('div', { cls: 'photo-thumb', 'data-photo-id': photo.id });

    if (photo.src) {
      const img = UI.el('img', { src: photo.src, alt: photo.label });
      const overlay = UI.el('div', { cls: 'photo-overlay' });

      const viewBtn   = UI.el('button', { style: 'background:rgba(255,255,255,0.15);border:1px solid rgba(255,255,255,0.3);color:#fff;border-radius:8px;padding:6px 12px;font-size:12px;font-weight:700;font-family:var(--font);cursor:pointer;', text: '🔍 View' });
      const deleteBtn = UI.el('button', { style: 'background:rgba(255,60,60,0.7);border:none;color:#fff;border-radius:8px;padding:6px 10px;font-size:12px;cursor:pointer;', text: '🗑' });

      viewBtn.addEventListener('click', (e) => { e.stopPropagation(); this.openLightbox(photo.src, photo.label); });
      deleteBtn.addEventListener('click', (e) => { e.stopPropagation(); this.deletePhoto(photo.id); });

      overlay.append(viewBtn, deleteBtn);
      wrap.append(img, overlay);
      wrap.addEventListener('click', () => this.openLightbox(photo.src, photo.label));
    } else {
      // Placeholder
      const ph = UI.el('div', { cls: 'photo-placeholder' });
      const icon = UI.el('div', { text: photo.emoji });
      const lbl  = UI.el('div', { style: 'font-size:11px;margin-top:6px;color:var(--muted);', text: photo.label });
      ph.style.background = photo.color;
      ph.append(icon, lbl);
      wrap.appendChild(ph);
      wrap.addEventListener('click', () => this.triggerUpload(photo.id));
    }

    return wrap;
  },

  /** Bind upload zone (click + drag-and-drop) */
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

  /** Open file picker. If photoId provided, replaces placeholder */
  triggerUpload(photoId = null) {
    const inp = document.createElement('input');
    inp.type    = 'file';
    inp.accept  = 'image/*';
    inp.multiple = photoId === null;
    inp.addEventListener('change', (e) => {
      const files = [...e.target.files];
      if (files.length) this.processFiles(files, photoId);
    });
    inp.click();
  },

  /** Read files and add to gallery */
  processFiles(files, replaceId = null) {
    let loaded = 0;
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const src = e.target.result;
        if (replaceId !== null) {
          // Replace existing placeholder
          const existing = AppState.photos.find(p => p.id === replaceId);
          if (existing) {
            existing.src   = src;
            existing.label = file.name.replace(/\.[^.]+$/, '');
          }
        } else {
          AppState.photos.unshift({
            id:    Date.now() + loaded,
            src,
            label: file.name.replace(/\.[^.]+$/, ''),
            emoji: '📷',
            color: 'linear-gradient(135deg,var(--primary),var(--secondary))',
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

  /** Remove a photo */
  deletePhoto(id) {
    AppState.photos = AppState.photos.filter(p => p.id !== id);
    this.renderGallery();
    UI.toast('Photo removed.', 'info');
  },

  /** Open lightbox */
  openLightbox(src, label = '') {
    const lb  = UI.$('lightbox');
    const img = UI.$('lightbox-img');
    const cap = UI.$('lightbox-caption');
    if (!lb || !img) return;
    img.src = src;
    if (cap) cap.textContent = label;
    lb.classList.add('open');
  },

  /** Close lightbox */
  closeLightbox() {
    const lb = UI.$('lightbox');
    if (lb) lb.classList.remove('open');
  },
};