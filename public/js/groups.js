/**
 * KipinQ — Groups Module (Facebook-style)
 * Views: Group list → Group detail (feed, members, settings)
 *
 * FIXES:
 *  1. Delete group button kini visible (btn-danger CSS typo dah fix dalam style.css)
 *  2. Edit modal kini ada Privacy field
 *  3. Members load menggunakan robust fallback
 *  4. grp-dropdown.open state ditambah
 *  5. saveEdit() kini hantar privacy
 *  6. showEditModal() kini set privacy value
 *  7. ✨ Emoji picker grid (cantik) dalam Create + Edit modal
 */

const Groups = {
  currentGroup: null,

  init() {
    // Do nothing on load, renderBrowse called when view is shown
  },

  /* ── Emoji choices for group creation/editing ── */
  _groupEmojis: [
    '🌐','🎭','🎨','🎸','📷','🏖','🏔','🚀',
    '🔥','💎','🌸','🌈','🎮','🍕','🐾','⚽',
    '📚','🎵','🌙','💫','🏋️','🎬','🌿','✈️',
    '🦋','🎪','🧪','🎯','🍃','💡','🏡','🤝',
  ],

  /* ── Inject emoji picker styles once ── */
  _injectGroupStyles() {
    if (document.getElementById('grp-emoji-styles')) return;
    const style = document.createElement('style');
    style.id = 'grp-emoji-styles';
    style.textContent = `
      /* ── Emoji picker section ── */
      .grp-emoji-label {
        font-size: 11px;
        font-weight: 800;
        letter-spacing: 1.1px;
        text-transform: uppercase;
        color: var(--muted);
        margin-bottom: 8px;
        margin-top: 10px;
        display: block;
      }

      /* Selected emoji preview badge */
      .grp-emoji-preview {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        background: var(--surface2);
        border: 1.5px solid var(--border);
        border-radius: 10px;
        padding: 6px 12px;
        margin-bottom: 10px;
        font-size: 13px;
        color: var(--muted);
      }
      .grp-emoji-preview-icon {
        font-size: 22px;
        line-height: 1;
        filter: drop-shadow(0 1px 4px rgba(0,0,0,.3));
      }

      /* Grid container */
      .grp-emoji-grid {
        display: grid;
        grid-template-columns: repeat(8, 1fr);
        gap: 5px;
        background: var(--surface2);
        border: 1.5px solid var(--border);
        border-radius: 12px;
        padding: 10px;
        margin-bottom: 14px;
        max-height: 130px;
        overflow-y: auto;
      }
      .grp-emoji-grid::-webkit-scrollbar { width: 4px; }
      .grp-emoji-grid::-webkit-scrollbar-thumb {
        background: var(--border2);
        border-radius: 4px;
      }

      /* Individual emoji button */
      .grp-emoji-opt {
        width: 34px;
        height: 34px;
        border-radius: 8px;
        border: 1.5px solid transparent;
        background: transparent;
        font-size: 18px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all .14s ease;
        position: relative;
      }
      .grp-emoji-opt:hover {
        background: var(--surface3);
        border-color: var(--border2);
        transform: scale(1.18);
        z-index: 1;
      }
      .grp-emoji-opt.selected {
        background: rgba(255, 77, 148, .18);
        border-color: var(--secondary);
        box-shadow: 0 0 10px rgba(255,77,148,.35);
        transform: scale(1.12);
      }

      /* Gradient swatch styling */
      .grp-grad-swatch {
        width: 34px;
        height: 34px;
        border-radius: 8px;
        cursor: pointer;
        border: 2.5px solid transparent;
        transition: all .15s ease;
        flex-shrink: 0;
      }
      .grp-grad-swatch:hover { transform: scale(1.12); }
      .grp-grad-swatch.selected {
        border-color: #fff;
        box-shadow: 0 0 0 2px var(--secondary), 0 0 12px rgba(255,77,148,.4);
        transform: scale(1.12);
      }
    `;
    document.head.appendChild(style);
  },

  /**
   * Build the emoji picker HTML for a given modal prefix (e.g. 'grp-c' or 'grp-e')
   * and a currently-selected emoji.
   */
  _emojiPickerHTML(prefix, selectedEmoji = '🌐') {
    const buttons = this._groupEmojis.map(em => `
      <button type="button"
        class="grp-emoji-opt${em === selectedEmoji ? ' selected' : ''}"
        data-emoji="${em}"
        title="${em}"
        onclick="Groups._selectEmoji('${prefix}','${em}',this)">
        ${em}
      </button>`).join('');

    return `
      <span class="grp-emoji-label">Group Icon</span>
      <div class="grp-emoji-preview" id="${prefix}-emoji-preview">
        <span class="grp-emoji-preview-icon" id="${prefix}-emoji-preview-icon">${selectedEmoji}</span>
        <span id="${prefix}-emoji-preview-text">Selected icon</span>
      </div>
      <div class="grp-emoji-grid" id="${prefix}-emoji-grid">
        ${buttons}
      </div>
      <input type="hidden" id="${prefix}-emoji" value="${selectedEmoji}">
    `;
  },

  /** Handle emoji selection — update hidden input + preview */
  _selectEmoji(prefix, emoji, clickedBtn) {
    // Update hidden input
    const inp = document.getElementById(`${prefix}-emoji`);
    if (inp) inp.value = emoji;

    // Update preview
    const previewIcon = document.getElementById(`${prefix}-emoji-preview-icon`);
    if (previewIcon) previewIcon.textContent = emoji;

    // Toggle selected class
    const grid = document.getElementById(`${prefix}-emoji-grid`);
    if (grid) {
      grid.querySelectorAll('.grp-emoji-opt').forEach(b => b.classList.remove('selected'));
    }
    if (clickedBtn) clickedBtn.classList.add('selected');
  },

  // ═══════════════════════════════════════════════
  //  BROWSE — grid of all groups
  // ═══════════════════════════════════════════════
  async renderBrowse() {
    this._injectGroupStyles();
    const view = document.getElementById('view-groups');
    if (!view) return;
    this.currentGroup = null;
    view.innerHTML = `<div class="grp-loading">Loading groups…</div>`;

    try {
      const res = await API.groups.list();
      const groups = res.groups || res.data || (Array.isArray(res) ? res : []);
      const me = API.auth.getUser();

      view.innerHTML = `
        <div class="grp-browse-wrap">

          <!-- Left sidebar -->
          <div class="grp-browse-side">
            <div class="grp-side-header">
              <h2 class="grp-side-title">Groups</h2>
              <button class="btn btn-primary btn-sm" onclick="Groups.showCreateModal()">+ Create</button>
            </div>
            <nav class="grp-side-menu">
              <button class="grp-side-item active" data-filter="all" onclick="Groups.sideFilter(this,'all')">
                <span class="grp-side-icon">🌐</span> Discover
              </button>
              <button class="grp-side-item" data-filter="joined" onclick="Groups.sideFilter(this,'joined')">
                <span class="grp-side-icon">✅</span> Your Groups
              </button>
              <button class="grp-side-item" data-filter="owned" onclick="Groups.sideFilter(this,'owned')">
                <span class="grp-side-icon">👑</span> Managed by You
              </button>
            </nav>
          </div>

          <!-- Main content -->
          <div class="grp-browse-main">
            <div class="grp-browse-top">
              <h3 class="grp-browse-heading" id="grp-browse-heading">Discover Groups</h3>
              <span class="grp-browse-count">${groups.length} group${groups.length !== 1 ? 's' : ''}</span>
            </div>

            <div class="grp-grid" id="grp-grid">
              ${groups.length === 0
                ? `<div class="grp-empty">
                    <div class="grp-empty-icon">🌐</div>
                    <div class="grp-empty-title">No groups yet</div>
                    <div class="grp-empty-desc">Be the first to create one!</div>
                    <button class="btn btn-primary" onclick="Groups.showCreateModal()" style="margin-top:14px;">+ Create Group</button>
                   </div>`
                : groups.map(g => Groups._cardHTML(g, me?.id || me?.user_id)).join('')
              }
            </div>
          </div>
        </div>

        ${Groups._createModalHTML()}
      `;

      document.addEventListener('click', () => Groups.closeAllMenus());

    } catch (err) {
      console.error(err);
      view.innerHTML = `<div class="grp-loading" style="color:var(--danger);">❌ Failed to load groups.</div>`;
    }
  },

  _cardHTML(g, myId) {
    const isOwner      = g.is_owner === true
                      || g.is_owner === 1
                      || g.role === 'owner'
                      || (myId && String(g.owner_id   || '') === String(myId))
                      || (myId && String(g.created_by || '') === String(myId))
                      || (myId && String(g.user_id    || '') === String(myId));
    const privacyIcon  = g.privacy === 'private' ? '🔒' : g.privacy === 'secret' ? '🕵️' : '🌐';
    const privacyLabel = g.privacy === 'private' ? 'Private' : g.privacy === 'secret' ? 'Secret' : 'Public';

    return `
      <div class="grp-card" data-joined="${g.joined ? 'true' : 'false'}" data-owned="${isOwner ? 'true' : 'false'}">
        <div class="grp-card-banner" style="background:${g.gradient || 'linear-gradient(135deg,#7B2FBE,#FF6B9D)'}" onclick="Groups.openGroup('${g.id}')">
          <span class="grp-card-emoji">${g.emoji || '🌐'}</span>
          <span class="grp-card-privacy-badge">${privacyIcon} ${privacyLabel}</span>
          ${isOwner ? `<span class="grp-card-owner-badge">👑 Owner</span>` : ''}
        </div>
        <div class="grp-card-body">
          <div class="grp-card-name" onclick="Groups.openGroup('${g.id}')">${UI.escapeHTML(g.name)}</div>
          <div class="grp-card-desc">${UI.escapeHTML(g.desc || 'No description.')}</div>
          <div class="grp-card-stats">
            <span>👥 ${UI.fmtNum(g.member_count || 0)} members</span>
            ${g.post_count != null ? `<span>📝 ${UI.fmtNum(g.post_count)} posts</span>` : ''}
          </div>
          <div class="grp-card-footer">
            <button class="btn btn-ghost btn-sm grp-view-btn" onclick="event.stopPropagation();Groups.openGroup('${g.id}')">View Group</button>
            ${g.joined
              ? `<button class="btn btn-ghost btn-sm" onclick="event.stopPropagation();Groups.leave('${g.id}')">✓ Joined</button>`
              : `<button class="btn btn-primary btn-sm" onclick="event.stopPropagation();Groups.join('${g.id}')">+ Join</button>`
            }
            ${isOwner ? `
              <div class="grp-menu-wrap" onclick="event.stopPropagation()">
                <button class="btn btn-ghost btn-sm grp-menu-trigger" onclick="Groups.toggleMenu('cmenu-${g.id}')">⚙️</button>
                <div class="grp-dropdown" id="cmenu-${g.id}">
                  <button onclick="Groups.closeAllMenus();Groups.showEditModal('${g.id}')">✏️ Edit Group</button>
                  <button onclick="Groups.closeAllMenus();Groups.openGroup('${g.id}','members')">👥 Members</button>
                  <div class="grp-dropdown-divider"></div>
                  <button class="danger" onclick="Groups.closeAllMenus();Groups.deleteGroup('${g.id}','${UI.escapeHTML(g.name).replace(/'/g, "\\'")}')">🗑️ Delete</button>
                </div>
              </div>` : ''}
          </div>
        </div>
      </div>
    `;
  },

  sideFilter(btn, filter) {
    document.querySelectorAll('.grp-side-item').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    let visibleCount = 0;
    document.querySelectorAll('.grp-card').forEach(c => {
      let show = true;
      if (filter === 'joined') show = c.dataset.joined === 'true';
      if (filter === 'owned')  show = c.dataset.owned  === 'true';
      c.style.display = show ? '' : 'none';
      if (show) visibleCount++;
    });
    const h = document.getElementById('grp-browse-heading');
    if (h) h.textContent = filter === 'joined' ? 'Your Groups' : filter === 'owned' ? 'Managed by You' : 'Discover Groups';
    const grid = document.getElementById('grp-grid');
    const existing = grid?.querySelector('.grp-filter-empty');
    if (existing) existing.remove();
    if (visibleCount === 0 && grid) {
      const label = filter === 'owned' ? 'You have not created any groups yet.'
                  : filter === 'joined' ? 'You have not joined any groups yet.'
                  : 'No groups found.';
      grid.insertAdjacentHTML('beforeend',
        `<div class="grp-filter-empty" style="grid-column:1/-1;text-align:center;padding:40px 20px;color:var(--muted);font-size:14px;">
          <div style="font-size:40px;margin-bottom:12px;">🔍</div>
          <div>${label}</div>
         </div>`
      );
    }
  },

  toggleMenu(id) {
    document.querySelectorAll('.grp-dropdown').forEach(d => {
      if (d.id !== id) d.classList.remove('open');
    });
    const dropdown = document.getElementById(id);
    if (!dropdown) return;
    const isOpen = dropdown.classList.toggle('open');
    if (isOpen) {
      const trigger = document.querySelector(`button[onclick*="${id}"]`);
      if (trigger) {
        const rect = trigger.getBoundingClientRect();
        dropdown.style.left = `${rect.right - dropdown.offsetWidth}px`;
        dropdown.style.top  = `${rect.bottom + 5}px`;
      }
    }
  },

  closeAllMenus() {
    document.querySelectorAll('.grp-dropdown').forEach(d => {
      d.classList.remove('open');
      d.style.left = '';
      d.style.top  = '';
    });
  },

  // ═══════════════════════════════════════════════
  //  GROUP DETAIL
  // ═══════════════════════════════════════════════
  async openGroup(groupId, defaultTab = 'feed') {
    this._injectGroupStyles();
    const view = document.getElementById('view-groups');
    if (!view) return;
    view.innerHTML = `<div class="grp-loading">Loading group…</div>`;

    try {
      const res = await API.groups.get(groupId);
      const g   = res.group || res;
      this.currentGroup = g;

      const me        = API.auth.getUser();
      const myId      = String(me?.id || '');
      const isOwner   = g.role === 'owner'
                     || String(g.owner_id    || '') === myId
                     || String(g.created_by  || '') === myId
                     || String(g.user_id     || '') === myId;
      const isMod     = g.role === 'moderator';
      const canManage = isOwner || isMod;
      const joined    = g.joined || isOwner;

      view.innerHTML = `
        <div class="grp-detail-wrap">

          <!-- Hero cover -->
          <div class="grp-cover" style="background:${g.gradient || 'linear-gradient(135deg,#7B2FBE,#FF6B9D)'}">
            <div class="grp-cover-emoji">${g.emoji || '🌐'}</div>
            <button class="grp-back-btn" onclick="Groups.renderBrowse()">← Back to Groups</button>
            ${isOwner ? `<button class="grp-cover-edit-btn" onclick="Groups.showEditModal('${g.id}')">✏️ Edit</button>` : ''}
          </div>

          <!-- Info bar -->
          <div class="grp-info-bar">
            <div class="grp-info-left">
              <h1 class="grp-detail-name">${UI.escapeHTML(g.name)}</h1>
              <div class="grp-detail-meta">
                <span>${g.privacy === 'private' ? '🔒 Private' : g.privacy === 'secret' ? '🕵️ Secret' : '🌐 Public'}</span>
                <span class="grp-meta-sep">·</span>
                <span>👥 ${UI.fmtNum(g.member_count || 0)} members</span>
                ${g.post_count != null ? `<span class="grp-meta-sep">·</span><span>📝 ${UI.fmtNum(g.post_count)} posts</span>` : ''}
              </div>
              ${g.desc ? `<p class="grp-detail-desc-bar">${UI.escapeHTML(g.desc)}</p>` : ''}
            </div>
            <div class="grp-info-actions">
              ${isOwner
                ? `<button class="btn btn-ghost btn-sm" onclick="Groups.showEditModal('${g.id}')">✏️ Edit Group</button>
                   <button class="btn btn-danger btn-sm" onclick="Groups.deleteGroup('${g.id}','${UI.escapeHTML(g.name).replace(/'/g, "\\'")}')">🗑️ Delete</button>`
                : joined
                  ? `<button class="btn btn-ghost btn-sm" onclick="Groups.leave('${g.id}')">✓ Joined · Leave</button>`
                  : `<button class="btn btn-primary" onclick="Groups.join('${g.id}')">+ Join Group</button>`
              }
            </div>
          </div>

          <!-- Tabs -->
          <div class="grp-tab-bar">
            <button class="grp-tab ${defaultTab === 'feed' ? 'active' : ''}" onclick="Groups.switchTab('feed',this)">📝 Discussion</button>
            <button class="grp-tab ${defaultTab === 'members' ? 'active' : ''}" onclick="Groups.switchTab('members',this)">👥 Members</button>
            ${canManage ? `<button class="grp-tab ${defaultTab === 'settings' ? 'active' : ''}" onclick="Groups.switchTab('settings',this)">⚙️ Settings</button>` : ''}
          </div>

          <!-- Content -->
          <div class="grp-tab-body" id="grp-tab-body"></div>

        </div>

        ${Groups._editModalHTML()}
      `;

      this._loadTab(defaultTab, g, canManage, isOwner, joined);

    } catch (err) {
      console.error(err);
      view.innerHTML = `<div class="grp-loading" style="color:var(--danger);">
        ❌ Failed to load group.
        <button class="btn btn-ghost btn-sm" onclick="Groups.renderBrowse()" style="margin-left:10px;">← Back</button>
      </div>`;
    }
  },

  switchTab(tab, btn) {
    document.querySelectorAll('.grp-tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const g = this.currentGroup;
    if (!g) return;
    const me        = API.auth.getUser();
    const myId      = String(me?.id || '');
    const isOwner   = g.role === 'owner'
                   || String(g.owner_id   || '') === myId
                   || String(g.created_by || '') === myId
                   || String(g.user_id    || '') === myId;
    const canManage = isOwner || g.role === 'moderator';
    const joined    = g.joined || isOwner;
    this._loadTab(tab, g, canManage, isOwner, joined);
  },

  async _loadTab(tab, g, canManage, isOwner, joined) {
    const body = document.getElementById('grp-tab-body');
    if (!body) return;
    if (tab === 'feed')          await this._renderFeed(g, joined, body);
    else if (tab === 'members')  await this._renderMembers(g, canManage, isOwner, body);
    else if (tab === 'settings') this._renderSettings(g, isOwner, body);
  },

  // ═══════════════════════════════════════════════
  //  FEED TAB
  // ═══════════════════════════════════════════════
  async _renderFeed(g, joined, container) {
    const me = API.auth.getUser();
    container.innerHTML = `
      <div class="grp-feed-layout">
        <div class="grp-feed-col">
          ${joined ? `
          <div class="grp-composer-card">
            <div class="grp-composer-row">
              ${UI.renderAvatar(me?.avatar, me?.username, 40).outerHTML}
              <button class="grp-composer-trigger" onclick="Groups.openComposer('${g.id}')">
                What's on your mind?
              </button>
            </div>
          </div>` : `
          <div class="grp-join-prompt">
            Join this group to post and comment.
            <button class="btn btn-primary btn-sm" onclick="Groups.join('${g.id}')">Join Group</button>
          </div>`}

          <div id="grp-posts" class="grp-posts-list">
            <div class="grp-loading" style="padding:30px 0;">Loading posts…</div>
          </div>
        </div>

        <div class="grp-feed-sidebar">
          <div class="grp-about-card">
            <div class="grp-about-title">About</div>
            ${g.desc ? `<p class="grp-about-desc">${UI.escapeHTML(g.desc)}</p>` : ''}
            <div class="grp-about-item">
              <span>${g.privacy === 'private' ? '🔒' : g.privacy === 'secret' ? '🕵️' : '🌐'}</span>
              <span>${g.privacy === 'private' ? 'Private · Members only' : g.privacy === 'secret' ? 'Secret · Invite only' : 'Public · Anyone can join'}</span>
            </div>
            <div class="grp-about-item">
              <span>👥</span>
              <span>${UI.fmtNum(g.member_count || 0)} members</span>
            </div>
            ${g.created_at ? `<div class="grp-about-item"><span>📅</span><span>Created ${new Date(g.created_at).toLocaleDateString('en-MY', { month: 'long', year: 'numeric' })}</span></div>` : ''}
            ${g.invite_code ? `
            <div class="grp-about-invite">
              <div class="grp-about-invite-label">Invite Link</div>
              <div class="grp-about-invite-row">
                <input class="input" id="grp-invite-inp" value="${window.location.origin}/join/${g.invite_code}" readonly style="font-size:11px;flex:1;">
                <button class="btn btn-ghost btn-sm" onclick="Groups.copyInvite('${g.invite_code}')">Copy</button>
              </div>
            </div>` : ''}
          </div>
        </div>
      </div>

      <!-- Composer modal -->
      <div id="grp-composer-modal" class="pf-modal-overlay pf-hidden" onclick="if(event.target===this)this.classList.add('pf-hidden')">
        <div class="pf-modal" onclick="event.stopPropagation()" style="width:520px;">
          <div class="pf-modal-title">Create Post in <span style="color:var(--secondary)">${UI.escapeHTML(g.name)}</span></div>
          <div style="display:flex;gap:10px;margin-top:14px;align-items:flex-start;">
            ${UI.renderAvatar(me?.avatar, me?.username, 42).outerHTML}
            <div style="flex:1;">
              <div style="font-weight:700;font-size:13px;margin-bottom:8px;">${UI.escapeHTML(me?.display_name || me?.username || 'You')}</div>
              <textarea id="grp-compose-text" class="input" rows="5" placeholder="Write something to the group…" style="resize:none;"></textarea>
            </div>
          </div>
          <div style="display:flex;gap:8px;margin-top:14px;justify-content:flex-end;">
            <button class="btn btn-ghost" onclick="document.getElementById('grp-composer-modal').classList.add('pf-hidden')">Cancel</button>
            <button class="btn btn-primary" onclick="Groups.submitPost('${g.id}')">Post</button>
          </div>
        </div>
      </div>
    `;

    await this._loadPosts(g.id);
  },

  openComposer(groupId) {
    const modal = document.getElementById('grp-composer-modal');
    if (modal) {
      modal.classList.remove('pf-hidden');
      setTimeout(() => document.getElementById('grp-compose-text')?.focus(), 80);
    }
  },

  async _loadPosts(groupId) {
    const container = document.getElementById('grp-posts');
    if (!container) return;
    try {
      const res   = await API.groups.getPosts(groupId);
      const posts = res.posts || [];
      const me    = API.auth.getUser();
      if (posts.length === 0) {
        container.innerHTML = `
          <div class="grp-empty-posts">
            <div style="font-size:44px;margin-bottom:10px;">📭</div>
            <div style="font-weight:700;font-size:15px;margin-bottom:4px;">No posts yet</div>
            <div style="color:var(--muted);font-size:13px;">Be the first to post!</div>
          </div>`;
        return;
      }
      container.innerHTML = posts.map(p => this._postHTML(p, me, groupId)).join('');
    } catch (err) {
      container.innerHTML = `<div style="color:var(--danger);padding:20px;text-align:center;">Failed to load posts.</div>`;
    }
  },

  _postHTML(p, me, groupId) {
    const isMine = String(p.user_id) === String(me?.id);
    const liked  = p.liked || false;
    return `
      <div class="grp-post-card" id="grp-post-${p.id}">
        <div class="grp-post-header">
          ${UI.renderAvatar(p.avatar, p.username, 42).outerHTML}
          <div class="grp-post-meta">
            <div class="grp-post-author">${UI.escapeHTML(p.display_name || p.username)}</div>
            <div class="grp-post-time">${this._timeAgo(p.created_at)}</div>
          </div>
          ${isMine ? `
          <div class="grp-menu-wrap" onclick="event.stopPropagation()" style="margin-left:auto;">
            <button class="grp-post-dots" onclick="Groups.toggleMenu('pm-${p.id}')">⋯</button>
            <div class="grp-dropdown" id="pm-${p.id}" style="right:0;left:auto;">
              <button class="danger" onclick="Groups.closeAllMenus();Groups.deletePost('${groupId}','${p.id}')">🗑️ Delete Post</button>
            </div>
          </div>` : ''}
        </div>
        <div class="grp-post-text">${UI.escapeHTML(p.text || '')}</div>
        ${p.image ? `<img src="${p.image}" class="grp-post-image" onclick="Groups._lightbox('${p.image}')" alt="">` : ''}
        ${(p.like_count || p.comment_count) ? `
        <div class="grp-post-summary">
          ${p.like_count    ? `<span class="grp-summary-likes">👍 ${UI.fmtNum(p.like_count)}</span>` : ''}
          ${p.comment_count ? `<span class="grp-summary-comments" onclick="Groups.toggleComments('${p.id}','${groupId}')">${UI.fmtNum(p.comment_count)} comment${p.comment_count !== 1 ? 's' : ''}</span>` : ''}
        </div>` : ''}
        <div class="grp-post-actions">
          <button class="grp-action-btn ${liked ? 'active' : ''}" id="like-btn-${p.id}" onclick="Groups.toggleLike('${groupId}','${p.id}')">
            👍 Like
          </button>
          <button class="grp-action-btn" onclick="Groups.toggleComments('${p.id}','${groupId}')">
            💬 Comment
          </button>
        </div>
        <div class="grp-comments-wrap" id="grp-comments-${p.id}" style="display:none;"></div>
      </div>
    `;
  },

  async submitPost(groupId) {
    const ta   = document.getElementById('grp-compose-text');
    const text = ta?.value?.trim();
    if (!text) { UI.toast('Write something first!', 'warn'); return; }
    try {
      await API.groups.createPost(groupId, text);
      document.getElementById('grp-composer-modal')?.classList.add('pf-hidden');
      if (ta) ta.value = '';
      UI.toast('Posted! 🎉', 'success');
      await this._loadPosts(groupId);
    } catch (err) { UI.toast(err.message || 'Failed to post', 'danger'); }
  },

  async toggleLike(groupId, postId) {
    const btn = document.getElementById(`like-btn-${postId}`);
    try {
      await API.posts.toggleLike(postId);
      if (btn) btn.classList.toggle('active');
    } catch (err) { UI.toast('Failed to like', 'danger'); }
  },

  async toggleComments(postId, groupId) {
    const wrap = document.getElementById(`grp-comments-${postId}`);
    if (!wrap) return;
    if (wrap.style.display !== 'none' && wrap.innerHTML !== '') {
      wrap.style.display = 'none';
      return;
    }
    wrap.style.display = 'block';
    wrap.innerHTML = `<div style="padding:12px;color:var(--muted);font-size:13px;">Loading…</div>`;
    const me = API.auth.getUser();
    try {
      const res      = await API.posts.getComments(postId);
      const comments = res.comments || [];
      wrap.innerHTML = `
        <div class="grp-comments-inner">
          <div class="grp-comments-list" id="grp-cl-${postId}">
            ${comments.length === 0
              ? `<div class="grp-no-comments">No comments yet.</div>`
              : comments.map(c => `
                <div class="grp-comment">
                  ${UI.renderAvatar(c.avatar, c.username, 32).outerHTML}
                  <div class="grp-comment-content">
                    <div class="grp-comment-bubble">
                      <span class="grp-comment-name">${UI.escapeHTML(c.display_name || c.username)}</span>
                      <span class="grp-comment-text">${UI.escapeHTML(c.text)}</span>
                    </div>
                    <div class="grp-comment-footer">
                      <span>${this._timeAgo(c.created_at)}</span>
                      ${String(c.user_id) === String(me?.id)
                        ? `<button class="grp-comment-del-btn" onclick="Groups.deleteComment('${postId}','${c.id}','${groupId}')">Delete</button>`
                        : ''}
                    </div>
                  </div>
                </div>`).join('')}
          </div>
          <div class="grp-comment-input-row">
            ${UI.renderAvatar(me?.avatar, me?.username, 32).outerHTML}
            <input class="grp-comment-input" id="grp-ci-${postId}"
              placeholder="Write a comment…"
              onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();Groups.addComment('${postId}','${groupId}')}">
            <button class="grp-comment-send-btn" onclick="Groups.addComment('${postId}','${groupId}')">→</button>
          </div>
        </div>
      `;
    } catch (err) {
      wrap.innerHTML = `<div style="color:var(--danger);padding:10px;font-size:13px;">Failed to load comments.</div>`;
    }
  },

  async addComment(postId, groupId) {
    const input = document.getElementById(`grp-ci-${postId}`);
    const text  = input?.value?.trim();
    if (!text) return;
    try {
      await API.posts.addComment(postId, text);
      if (input) input.value = '';
      const wrap = document.getElementById(`grp-comments-${postId}`);
      if (wrap) wrap.innerHTML = '';
      await this.toggleComments(postId, groupId);
    } catch (err) { UI.toast(err.message || 'Failed', 'danger'); }
  },

  async deleteComment(postId, commentId, groupId) {
    if (!confirm('Delete this comment?')) return;
    try {
      await API.posts.deleteComment(postId, commentId);
      const wrap = document.getElementById(`grp-comments-${postId}`);
      if (wrap) wrap.innerHTML = '';
      await this.toggleComments(postId, groupId);
    } catch (err) { UI.toast(err.message || 'Failed', 'danger'); }
  },

  async deletePost(groupId, postId) {
    if (!confirm('Delete this post?')) return;
    try {
      await API.groups.deletePost(groupId, postId);
      document.getElementById(`grp-post-${postId}`)?.remove();
      UI.toast('Post deleted.', 'info');
    } catch (err) { UI.toast(err.message || 'Failed', 'danger'); }
  },

  _lightbox(src) {
    const el = document.createElement('div');
    el.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.92);z-index:9999;display:flex;align-items:center;justify-content:center;cursor:zoom-out;';
    el.innerHTML = `<img src="${src}" style="max-width:90vw;max-height:90vh;border-radius:12px;object-fit:contain;">`;
    el.onclick = () => el.remove();
    document.body.appendChild(el);
  },

  // ═══════════════════════════════════════════════
  //  MEMBERS TAB
  // ═══════════════════════════════════════════════
  async _renderMembers(g, canManage, isOwner, container) {
    const joined = g.joined || isOwner;
    if (!joined && g.privacy !== 'public') {
      container.innerHTML = `
        <div style="color:var(--muted);padding:24px;text-align:center;">
          ${g.privacy === 'secret' ? 'Members are hidden for secret groups.' : 'Join this group to view members.'}
          ${!joined ? `<div style="margin-top:16px;"><button class="btn btn-primary btn-sm" onclick="Groups.join('${g.id}')">Join group</button></div>` : ''}
        </div>`;
      return;
    }
    container.innerHTML = `<div class="grp-loading">Loading members…</div>`;
    let members = [];
    try {
      const res = await API.groups.members(g.id);
      members = res.members || res || [];
      if (!Array.isArray(members)) members = [];
    } catch {
      try {
        const fallback = await API.groups.get(g.id);
        members = fallback.members || fallback.group?.members || [];
      } catch (finalErr) {
        container.innerHTML = `<div style="color:var(--danger);padding:20px;text-align:center;">${UI.escapeHTML(finalErr.message || 'Failed to load members.')}</div>`;
        return;
      }
    }
    const me = API.auth.getUser();
    container.innerHTML = `
      <div class="grp-members-wrap">
        <div class="grp-members-heading">
          <h3>All Members <span style="color:var(--muted);font-weight:500;font-size:14px;">(${members.length})</span></h3>
        </div>
        ${members.length === 0
          ? `<div style="color:var(--muted);padding:24px;text-align:center;">No members found.</div>`
          : `<div class="grp-members-grid">
              ${members.map(m => {
                const roleColor = m.role === 'owner' ? '#FFD700' : m.role === 'moderator' ? 'var(--primary)' : '';
                const roleLabel = m.role === 'owner' ? '👑 Owner' : m.role === 'moderator' ? '🛡️ Mod' : '';
                const isSelf    = String(m.id) === String(me?.id);
                return `
                  <div class="grp-member-card">
                    ${UI.renderAvatar(m.avatar, m.username, 48).outerHTML}
                    <div class="grp-member-details">
                      <div class="grp-member-name">${UI.escapeHTML(m.display_name || m.username)}</div>
                      <div class="grp-member-handle">@${UI.escapeHTML(m.username)}</div>
                      ${roleLabel ? `<div class="grp-member-role" style="color:${roleColor}">${roleLabel}</div>` : ''}
                    </div>
                    ${canManage && m.role !== 'owner' && !isSelf ? `
                    <div class="grp-menu-wrap" onclick="event.stopPropagation()" style="margin-left:auto;">
                      <button class="btn btn-ghost btn-sm" onclick="Groups.toggleMenu('mm-${m.id}')">⋯</button>
                      <div class="grp-dropdown" id="mm-${m.id}" style="right:0;left:auto;">
                        ${isOwner && m.role !== 'moderator' ? `<button onclick="Groups.closeAllMenus();Groups.promoteMember('${g.id}','${m.id}','moderator')">🛡️ Make Mod</button>` : ''}
                        ${isOwner && m.role === 'moderator'  ? `<button onclick="Groups.closeAllMenus();Groups.promoteMember('${g.id}','${m.id}','member')">👤 Remove Mod</button>` : ''}
                        <div class="grp-dropdown-divider"></div>
                        <button class="danger" onclick="Groups.closeAllMenus();Groups.kickMember('${g.id}','${m.id}','${UI.escapeHTML(m.username)}')">🚫 Kick</button>
                      </div>
                    </div>` : ''}
                  </div>`;
              }).join('')}
            </div>`
        }
      </div>
    `;
  },

  async kickMember(groupId, memberId, username) {
    if (!confirm(`Kick @${username} from this group?`)) return;
    try {
      await API.groups.kickMember(groupId, memberId);
      UI.toast(`@${username} removed.`, 'info');
      this.openGroup(groupId, 'members');
    } catch (err) { UI.toast(err.message || 'Failed', 'danger'); }
  },

  async promoteMember(groupId, memberId, role) {
    try {
      await API.groups.updateMemberRole(groupId, memberId, role);
      UI.toast(role === 'moderator' ? 'Promoted to Moderator! 🛡️' : 'Moderator role removed.', 'success');
      this.openGroup(groupId, 'members');
    } catch (err) { UI.toast(err.message || 'Failed', 'danger'); }
  },

  // ═══════════════════════════════════════════════
  //  SETTINGS TAB
  // ═══════════════════════════════════════════════
  _renderSettings(g, isOwner, container) {
    const gradients = [
      'linear-gradient(135deg,#7B2FBE,#FF6B9D)', 'linear-gradient(135deg,#0EA5E9,#6366F1)',
      'linear-gradient(135deg,#10B981,#3B82F6)',  'linear-gradient(135deg,#F59E0B,#EF4444)',
      'linear-gradient(135deg,#EC4899,#8B5CF6)',  'linear-gradient(135deg,#14B8A6,#0F172A)',
    ];

    container.innerHTML = `
      <div class="grp-settings-wrap">

        <div class="grp-settings-card">
          <div class="grp-settings-card-title">General Settings</div>

          <div class="pf-field"><label>Group Name *</label>
            <input id="gst-name" class="input" value="${UI.escapeHTML(g.name)}">
          </div>
          <div class="pf-field" style="margin-top:10px;"><label>Description</label>
            <textarea id="gst-desc" class="input" rows="3">${UI.escapeHTML(g.desc || '')}</textarea>
          </div>
          <div style="display:flex;gap:12px;margin-top:10px;align-items:flex-start;">
            <div class="pf-field" style="flex:2;">
              ${this._emojiPickerHTML('gst', g.emoji || '🌐')}
            </div>
            <div class="pf-field" style="flex:2;"><label>Privacy</label>
              <select id="gst-privacy" class="input">
                <option value="public"  ${g.privacy === 'public'  ? 'selected' : ''}>🌐 Public</option>
                <option value="private" ${g.privacy === 'private' ? 'selected' : ''}>🔒 Private</option>
                <option value="secret"  ${g.privacy === 'secret'  ? 'selected' : ''}>🕵️ Secret</option>
              </select>
            </div>
          </div>
          <div class="pf-field" style="margin-top:10px;"><label>Theme Colour</label>
            <div style="display:flex;gap:8px;flex-wrap:wrap;" id="gst-grad-pick">
              ${gradients.map(gr => `<div class="grp-grad-swatch${gr === g.gradient ? ' selected' : ''}"
                onclick="Groups._pickGrad(this,'${gr}','gst-grad','gst-grad-pick')"
                style="background:${gr};"
                data-gradient="${gr}"></div>`).join('')}
            </div>
            <input type="hidden" id="gst-grad" value="${g.gradient || ''}">
          </div>
          <button class="btn btn-primary" style="margin-top:14px;" onclick="Groups._saveSettings('${g.id}')">Save Changes</button>
        </div>

        <div class="grp-settings-card">
          <div class="grp-settings-card-title">Invite Link</div>
          <div style="display:flex;gap:8px;align-items:center;">
            <input class="input" id="gst-invite" value="${window.location.origin}/join/${g.invite_code || ''}" readonly style="font-size:12px;flex:1;">
            <button class="btn btn-ghost btn-sm" onclick="Groups.copyInvite('${g.invite_code}')">Copy</button>
            <button class="btn btn-ghost btn-sm" title="Regenerate" onclick="Groups.regenerateInvite('${g.id}')">🔄</button>
          </div>
        </div>

        <div class="grp-settings-card grp-danger-card">
          <div class="grp-settings-card-title" style="color:var(--danger);">⚠️ Danger Zone</div>
          <p style="font-size:13px;color:var(--muted);margin:0 0 12px;">Permanently delete this group and all its posts. This cannot be undone.</p>
          <button class="btn btn-danger" onclick="Groups.deleteGroup('${g.id}','${UI.escapeHTML(g.name).replace(/'/g, "\\'")}')">🗑️ Delete This Group</button>
        </div>

      </div>
    `;
  },

  _pickGrad(el, val, inputId, pickerId) {
    document.querySelectorAll(`#${pickerId} .grp-grad-swatch, #${pickerId} > div`).forEach(d => {
      d.style.border  = '2px solid transparent';
      d.classList.remove('selected');
    });
    el.style.border = '2px solid var(--primary)';
    el.classList.add('selected');
    const inp = document.getElementById(inputId);
    if (inp) inp.value = val;
  },

  async _saveSettings(groupId) {
    const name = document.getElementById('gst-name')?.value.trim();
    if (!name) { UI.toast('Name is required.', 'warn'); return; }
    try {
      await API.groups.update(groupId, {
        name,
        desc:     document.getElementById('gst-desc')?.value.trim(),
        emoji:    document.getElementById('gst-emoji')?.value.trim(),
        privacy:  document.getElementById('gst-privacy')?.value,
        gradient: document.getElementById('gst-grad')?.value,
      });
      UI.toast('Saved! ✅', 'success');
      this.openGroup(groupId, 'settings');
    } catch (err) { UI.toast(err.message || 'Failed', 'danger'); }
  },

  copyInvite(code) {
    navigator.clipboard.writeText(`${window.location.origin}/join/${code}`)
      .then(() => UI.toast('Invite link copied! 🔗', 'success'));
  },

  async regenerateInvite(groupId) {
    if (!confirm('Regenerate? The old link will stop working.')) return;
    try {
      const res = await API.groups.regenerateInvite(groupId);
      ['gst-invite', 'grp-invite-inp'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = `${window.location.origin}/join/${res.invite_code}`;
      });
      UI.toast('Link regenerated!', 'success');
    } catch (err) { UI.toast(err.message || 'Failed', 'danger'); }
  },

  // ═══════════════════════════════════════════════
  //  CREATE MODAL  ✨ now with emoji picker grid
  // ═══════════════════════════════════════════════
  _createModalHTML() {
    const gradients = [
      'linear-gradient(135deg,#7B2FBE,#FF6B9D)', 'linear-gradient(135deg,#0EA5E9,#6366F1)',
      'linear-gradient(135deg,#10B981,#3B82F6)',  'linear-gradient(135deg,#F59E0B,#EF4444)',
      'linear-gradient(135deg,#EC4899,#8B5CF6)',  'linear-gradient(135deg,#14B8A6,#0F172A)',
    ];
    return `
      <div id="create-group-modal" class="pf-modal-overlay pf-hidden" onclick="if(event.target===this)Groups.hideCreateModal()">
        <div class="pf-modal" onclick="event.stopPropagation()" style="width:500px;max-height:90vh;overflow-y:auto;">
          <div class="pf-modal-title">🌐 Create New Group</div>

          <div class="pf-field" style="margin-top:14px;"><label>Group Name *</label>
            <input id="grp-c-name" class="input" placeholder="e.g. Photography Lovers" maxlength="60">
          </div>

          <div class="pf-field" style="margin-top:10px;"><label>Description</label>
            <textarea id="grp-c-desc" class="input" rows="3" placeholder="What is this group about?"></textarea>
          </div>

          <!-- ✨ Emoji picker grid (replaces plain text input) -->
          <div style="margin-top:10px;">
            ${this._emojiPickerHTML('grp-c', '🌐')}
          </div>

          <div class="pf-field" style="margin-top:4px;"><label>Privacy</label>
            <select id="grp-c-privacy" class="input">
              <option value="public">🌐 Public</option>
              <option value="private">🔒 Private</option>
              <option value="secret">🕵️ Secret</option>
            </select>
          </div>

          <div class="pf-field" style="margin-top:10px;"><label>Theme Colour</label>
            <div style="display:flex;gap:8px;flex-wrap:wrap;" id="grp-c-grad-pick">
              ${gradients.map((g, i) => `<div class="grp-grad-swatch${i === 0 ? ' selected' : ''}"
                onclick="Groups._pickGrad(this,'${g}','grp-c-grad','grp-c-grad-pick')"
                style="background:${g};"
                data-gradient="${g}"></div>`).join('')}
            </div>
            <input type="hidden" id="grp-c-grad" value="${gradients[0]}">
          </div>

          <div style="display:flex;gap:8px;margin-top:18px;">
            <button class="btn btn-primary" onclick="Groups.createGroup()" style="flex:1;">Create Group</button>
            <button class="btn btn-ghost" onclick="Groups.hideCreateModal()" style="flex:1;">Cancel</button>
          </div>
        </div>
      </div>
    `;
  },

  showCreateModal() {
    document.getElementById('create-group-modal')?.classList.remove('pf-hidden');
  },
  hideCreateModal() {
    document.getElementById('create-group-modal')?.classList.add('pf-hidden');
  },

  async createGroup() {
    const name = document.getElementById('grp-c-name')?.value.trim();
    if (!name) { UI.toast('Name is required.', 'warn'); return; }
    try {
      await API.groups.create({
        name,
        desc:     document.getElementById('grp-c-desc')?.value.trim() || '',
        emoji:    document.getElementById('grp-c-emoji')?.value.trim() || '🌐',
        privacy:  document.getElementById('grp-c-privacy')?.value || 'public',
        gradient: document.getElementById('grp-c-grad')?.value || '',
      });
      UI.toast('Group created! 🎉', 'success');
      this.hideCreateModal();
      this.renderBrowse();
    } catch (err) { UI.toast(err.message || 'Failed', 'danger'); }
  },

  // ═══════════════════════════════════════════════
  //  EDIT MODAL  ✨ now with emoji picker grid
  // ═══════════════════════════════════════════════
  _editModalHTML() {
    const gradients = [
      'linear-gradient(135deg,#7B2FBE,#FF6B9D)', 'linear-gradient(135deg,#0EA5E9,#6366F1)',
      'linear-gradient(135deg,#10B981,#3B82F6)',  'linear-gradient(135deg,#F59E0B,#EF4444)',
      'linear-gradient(135deg,#EC4899,#8B5CF6)',  'linear-gradient(135deg,#14B8A6,#0F172A)',
    ];
    return `
      <div id="edit-group-modal" class="pf-modal-overlay pf-hidden" onclick="if(event.target===this)Groups.hideEditModal()">
        <div class="pf-modal" onclick="event.stopPropagation()" style="width:500px;max-height:90vh;overflow-y:auto;">
          <div class="pf-modal-title">✏️ Edit Group</div>
          <input type="hidden" id="grp-e-id">

          <div class="pf-field" style="margin-top:14px;"><label>Group Name *</label>
            <input id="grp-e-name" class="input" maxlength="60">
          </div>

          <div class="pf-field" style="margin-top:10px;"><label>Description</label>
            <textarea id="grp-e-desc" class="input" rows="3"></textarea>
          </div>

          <!-- ✨ Emoji picker grid -->
          <div style="margin-top:10px;" id="grp-e-emoji-wrap">
            ${this._emojiPickerHTML('grp-e', '🌐')}
          </div>

          <div class="pf-field" style="margin-top:4px;"><label>Privacy</label>
            <select id="grp-e-privacy" class="input">
              <option value="public">🌐 Public</option>
              <option value="private">🔒 Private</option>
              <option value="secret">🕵️ Secret</option>
            </select>
          </div>

          <div class="pf-field" style="margin-top:10px;"><label>Theme Colour</label>
            <div style="display:flex;gap:8px;flex-wrap:wrap;" id="grp-e-grad-pick">
              ${gradients.map(g => `<div class="grp-grad-swatch"
                onclick="Groups._pickGrad(this,'${g}','grp-e-grad','grp-e-grad-pick')"
                style="background:${g};"
                data-gradient="${g}"></div>`).join('')}
            </div>
            <input type="hidden" id="grp-e-grad">
          </div>

          <div style="display:flex;gap:8px;margin-top:18px;">
            <button class="btn btn-primary" onclick="Groups.saveEdit()" style="flex:1;">Save Changes</button>
            <button class="btn btn-ghost" onclick="Groups.hideEditModal()" style="flex:1;">Cancel</button>
          </div>
        </div>
      </div>
    `;
  },

  async showEditModal(groupId) {
    if (!document.getElementById('edit-group-modal')) {
      document.body.insertAdjacentHTML('beforeend', this._editModalHTML());
    }
    try {
      const res = await API.groups.get(groupId);
      const g   = res.group || res;

      document.getElementById('grp-e-id').value   = g.id;
      document.getElementById('grp-e-name').value = g.name;
      document.getElementById('grp-e-desc').value = g.desc || '';

      // Set hidden emoji input + update picker selection + preview
      const currentEmoji = g.emoji || '🌐';
      const emojiInp = document.getElementById('grp-e-emoji');
      if (emojiInp) emojiInp.value = currentEmoji;

      // Update preview icon
      const previewIcon = document.getElementById('grp-e-emoji-preview-icon');
      if (previewIcon) previewIcon.textContent = currentEmoji;

      // Mark correct emoji button as selected
      const grid = document.getElementById('grp-e-emoji-grid');
      if (grid) {
        grid.querySelectorAll('.grp-emoji-opt').forEach(btn => {
          btn.classList.toggle('selected', btn.dataset.emoji === currentEmoji);
        });
      }

      // Set privacy
      const privacySel = document.getElementById('grp-e-privacy');
      if (privacySel) privacySel.value = g.privacy || 'public';

      // Set gradient
      document.getElementById('grp-e-grad').value = g.gradient || '';
      document.querySelectorAll('#grp-e-grad-pick .grp-grad-swatch').forEach(d => {
        const match = d.dataset.gradient === g.gradient;
        d.classList.toggle('selected', match);
        d.style.border = match ? '2px solid var(--primary)' : '2px solid transparent';
      });

      document.getElementById('edit-group-modal')?.classList.remove('pf-hidden');
    } catch (err) { UI.toast('Failed to load group.', 'danger'); }
  },

  hideEditModal() {
    document.getElementById('edit-group-modal')?.classList.add('pf-hidden');
  },

  async saveEdit() {
    const id   = document.getElementById('grp-e-id')?.value;
    const name = document.getElementById('grp-e-name')?.value.trim();
    if (!name) { UI.toast('Name is required.', 'warn'); return; }
    try {
      await API.groups.update(id, {
        name,
        desc:     document.getElementById('grp-e-desc')?.value.trim(),
        emoji:    document.getElementById('grp-e-emoji')?.value.trim(),
        privacy:  document.getElementById('grp-e-privacy')?.value || 'public',
        gradient: document.getElementById('grp-e-grad')?.value,
      });
      UI.toast('Updated! ✅', 'success');
      this.hideEditModal();
      this.currentGroup ? this.openGroup(id) : this.renderBrowse();
    } catch (err) { UI.toast(err.message || 'Failed', 'danger'); }
  },

  // ═══════════════════════════════════════════════
  //  JOIN / LEAVE / DELETE
  // ═══════════════════════════════════════════════
  async join(groupId) {
    try {
      await API.groups.join(groupId);
      UI.toast('Joined! 🎉', 'success');
      this.currentGroup ? this.openGroup(groupId) : this.renderBrowse();
    } catch (err) { UI.toast(err.message || 'Failed', 'danger'); }
  },

  async leave(groupId) {
    if (!confirm('Leave this group?')) return;
    try {
      await API.groups.leave(groupId);
      UI.toast('Left group.', 'info');
      this.currentGroup = null;
      this.renderBrowse();
    } catch (err) { UI.toast(err.message || 'Failed', 'danger'); }
  },

  async deleteGroup(groupId, groupName) {
    if (!confirm(`Delete "${groupName}"? This cannot be undone.`)) return;
    const typed = prompt(`Type the group name to confirm:\n"${groupName}"`);
    if (typed !== groupName) { UI.toast('Name did not match. Cancelled.', 'warn'); return; }
    try {
      await API.groups.delete(groupId);
      UI.toast('Group deleted.', 'info');
      this.currentGroup = null;
      this.renderBrowse();
    } catch (err) { UI.toast(err.message || 'Failed', 'danger'); }
  },

  // ═══════════════════════════════════════════════
  //  HELPERS
  // ═══════════════════════════════════════════════
  _timeAgo(dateStr) {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1)  return 'just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    const d = Math.floor(h / 24);
    if (d < 7)  return `${d}d ago`;
    return new Date(dateStr).toLocaleDateString('en-MY', { day: 'numeric', month: 'short' });
  },
};