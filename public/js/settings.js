/**
 * FriendSpace — Settings Module
 * Handles: theme, appearance, privacy, notifications, account preferences.
 * All settings are persisted to localStorage under the key 'fs_settings'.
 */

const Settings = {

  // Default settings schema
  defaults: {
    // Appearance
    theme: 'purple-night',       // 'purple-night' | 'midnight-blue' | 'rose-gold' | 'forest' | 'light'
    accentColor: '#FF6B9D',
    fontSize: 'medium',          // 'small' | 'medium' | 'large'
    animationsEnabled: true,
    compactMode: false,
    glowEffects: true,

    // Privacy
    profileVisible: 'friends',   // 'everyone' | 'friends' | 'only-me'
    postVisible: 'everyone',     // 'everyone' | 'friends' | 'only-me'
    showOnlineStatus: true,
    showLastSeen: true,
    allowFriendRequests: true,
    showInSearch: true,

    // Notifications
    notifyFriendRequests: true,
    notifyMessages: true,
    notifyLikes: true,
    notifyComments: true,
    notifyGroupActivity: false,
    soundEnabled: true,

    // Feed
    autoplayVideos: false,
    showSuggestedPosts: true,
    feedLayout: 'default',       // 'default' | 'compact' | 'wide'

    // Account
    language: 'en',
    timezone: 'auto',
  },

  // Loaded/active settings
  current: {},

  // Theme presets
  themes: {
    'purple-night': {
      label: '💜 Purple Night',
      vars: {
        '--primary':   '#7B2FBE',
        '--secondary': '#FF6B9D',
        '--accent':    '#FFD700',
        '--bg':        '#1a0a2e',
        '--surface':   '#2d1b4e',
        '--surface2':  '#3d2860',
        '--text':      '#f0e6ff',
        '--muted':     '#a98bc8',
        '--border':    '#5a3a8a',
      },
    },
    'midnight-blue': {
      label: '🌊 Midnight Blue',
      vars: {
        '--primary':   '#1565C0',
        '--secondary': '#00BCD4',
        '--accent':    '#FFD700',
        '--bg':        '#050e1a',
        '--surface':   '#0d1f33',
        '--surface2':  '#162a44',
        '--text':      '#e0f0ff',
        '--muted':     '#7bafd4',
        '--border':    '#1e3a5a',
      },
    },
    'rose-gold': {
      label: '🌸 Rose Gold',
      vars: {
        '--primary':   '#c0396e',
        '--secondary': '#e8a87c',
        '--accent':    '#f6d365',
        '--bg':        '#1c0a12',
        '--surface':   '#2e1220',
        '--surface2':  '#3e1a2c',
        '--text':      '#ffe4ef',
        '--muted':     '#c48fa8',
        '--border':    '#6b2e46',
      },
    },
    'forest': {
      label: '🌿 Forest Dark',
      vars: {
        '--primary':   '#2e7d32',
        '--secondary': '#66bb6a',
        '--accent':    '#FFD700',
        '--bg':        '#071a09',
        '--surface':   '#0f2d12',
        '--surface2':  '#173d1a',
        '--text':      '#e0ffe4',
        '--muted':     '#7ab87e',
        '--border':    '#2a5c2e',
      },
    },
    'light': {
      label: '☀️ Light Mode',
      vars: {
        '--primary':   '#7B2FBE',
        '--secondary': '#e91e8c',
        '--accent':    '#f57c00',
        '--bg':        '#f4f0fb',
        '--surface':   '#ffffff',
        '--surface2':  '#ede7f6',
        '--text':      '#1a0a2e',
        '--muted':     '#7b5fa0',
        '--border':    '#d1c4e9',
      },
    },
  },

  init() {
    this.load();
    this.applyAll();
    this.renderView();
  },

  /** Load from localStorage, falling back to defaults */
  load() {
    try {
      const saved = localStorage.getItem('fs_settings');
      this.current = saved ? { ...this.defaults, ...JSON.parse(saved) } : { ...this.defaults };
    } catch {
      this.current = { ...this.defaults };
    }
  },

  /** Save current settings to localStorage */
  save() {
    try {
      localStorage.setItem('fs_settings', JSON.stringify(this.current));
    } catch {
      // Storage not available
    }
  },

  /** Apply all settings to the DOM */
  applyAll() {
    this.applyTheme(this.current.theme);
    this.applyFontSize(this.current.fontSize);
    this.applyAnimations(this.current.animationsEnabled);
    this.applyCompactMode(this.current.compactMode);
    this.applyGlowEffects(this.current.glowEffects);
  },

  applyTheme(themeKey) {
    const theme = this.themes[themeKey];
    if (!theme) return;
    const root = document.documentElement;
    Object.entries(theme.vars).forEach(([k, v]) => root.style.setProperty(k, v));
    this.current.theme = themeKey;

    // Update accent colour override if set
    if (this.current.accentColor && themeKey !== 'custom') {
      // keep default accent from theme
    }
  },

  applyFontSize(size) {
    const sizes = { small: '12px', medium: '14px', large: '16px' };
    document.documentElement.style.setProperty('font-size', sizes[size] || '14px');
    document.body.style.fontSize = sizes[size] || '14px';
    this.current.fontSize = size;
  },

  applyAnimations(enabled) {
    document.documentElement.style.setProperty('--transition', enabled ? '0.18s ease' : '0s');
    this.current.animationsEnabled = enabled;
  },

  applyCompactMode(compact) {
    document.body.classList.toggle('compact-mode', compact);
    this.current.compactMode = compact;
  },

  applyGlowEffects(enabled) {
    document.body.classList.toggle('no-glow', !enabled);
    this.current.glowEffects = enabled;
  },

  /** Set a single setting and apply it */
  set(key, value) {
    this.current[key] = value;
    this.save();

    // Live-apply specific settings
    if (key === 'theme')             this.applyTheme(value);
    if (key === 'fontSize')          this.applyFontSize(value);
    if (key === 'animationsEnabled') this.applyAnimations(value);
    if (key === 'compactMode')       this.applyCompactMode(value);
    if (key === 'glowEffects')       this.applyGlowEffects(value);
    if (key === 'showOnlineStatus')  this.applyOnlineStatus(value);
  },

  applyOnlineStatus(show) {
    const dot = document.querySelector('.online-dot');
    if (dot) dot.style.display = show ? '' : 'none';
  },

  resetToDefaults() {
    this.current = { ...this.defaults };
    this.save();
    this.applyAll();
    this.renderView();
    if (typeof UI !== 'undefined') UI.toast('Settings reset to defaults.', 'info');
  },

  /** Build and inject the Settings view HTML */
  renderView() {
    const view = document.getElementById('view-settings');
    if (!view) return;
    const s = this.current;

    view.innerHTML = `
      <div class="settings-page">
        <div class="settings-header">
          <div class="settings-title">⚙️ Settings</div>
          <div class="settings-subtitle">Customise your FriendSpace experience</div>
        </div>

        <div class="settings-grid">

          <!-- ── APPEARANCE ── -->
          <div class="settings-card">
            <div class="settings-card-title">🎨 Appearance</div>

            <div class="settings-group">
              <div class="settings-label">Theme</div>
              <div class="theme-grid" id="theme-grid">${this._buildThemeGrid()}</div>
            </div>

            <div class="settings-row">
              <div>
                <div class="settings-label">Font Size</div>
                <div class="settings-desc">Adjust how large text appears.</div>
              </div>
              <div class="seg-control" id="font-size-seg">
                ${['small','medium','large'].map(sz => `
                  <button class="seg-btn${s.fontSize === sz ? ' active' : ''}" data-value="${sz}" onclick="Settings._onSeg('fontSize','font-size-seg',this)">${sz.charAt(0).toUpperCase()+sz.slice(1)}</button>
                `).join('')}
              </div>
            </div>

            <div class="settings-row">
              <div>
                <div class="settings-label">Feed Layout</div>
                <div class="settings-desc">Choose your post display style.</div>
              </div>
              <div class="seg-control" id="feed-layout-seg">
                ${['default','compact','wide'].map(l => `
                  <button class="seg-btn${s.feedLayout === l ? ' active' : ''}" data-value="${l}" onclick="Settings._onSeg('feedLayout','feed-layout-seg',this)">${l.charAt(0).toUpperCase()+l.slice(1)}</button>
                `).join('')}
              </div>
            </div>

            <div class="settings-row">
              <div>
                <div class="settings-label">Animations</div>
                <div class="settings-desc">Enable smooth transitions and effects.</div>
              </div>
              <label class="toggle-switch">
                <input type="checkbox" id="tog-animations" ${s.animationsEnabled ? 'checked' : ''} onchange="Settings.set('animationsEnabled', this.checked)">
                <span class="toggle-track"><span class="toggle-thumb"></span></span>
              </label>
            </div>

            <div class="settings-row">
              <div>
                <div class="settings-label">Glow Effects</div>
                <div class="settings-desc">Neon glow on avatars and borders.</div>
              </div>
              <label class="toggle-switch">
                <input type="checkbox" id="tog-glow" ${s.glowEffects ? 'checked' : ''} onchange="Settings.set('glowEffects', this.checked)">
                <span class="toggle-track"><span class="toggle-thumb"></span></span>
              </label>
            </div>

            <div class="settings-row">
              <div>
                <div class="settings-label">Compact Mode</div>
                <div class="settings-desc">Reduce spacing for more content on screen.</div>
              </div>
              <label class="toggle-switch">
                <input type="checkbox" id="tog-compact" ${s.compactMode ? 'checked' : ''} onchange="Settings.set('compactMode', this.checked)">
                <span class="toggle-track"><span class="toggle-thumb"></span></span>
              </label>
            </div>
          </div>

          <!-- ── PRIVACY ── -->
          <div class="settings-card">
            <div class="settings-card-title">🔒 Privacy</div>

            <div class="settings-row">
              <div>
                <div class="settings-label">Who can see my posts?</div>
                <div class="settings-desc">Control post visibility.</div>
              </div>
              <select class="settings-select" onchange="Settings.set('postVisible', this.value)">
                <option value="everyone" ${s.postVisible==='everyone'?'selected':''}>🌐 Everyone</option>
                <option value="friends"  ${s.postVisible==='friends' ?'selected':''}>👥 Friends only</option>
                <option value="only-me"  ${s.postVisible==='only-me' ?'selected':''}>🔒 Only me</option>
              </select>
            </div>

            <div class="settings-row">
              <div>
                <div class="settings-label">Who can see my profile?</div>
                <div class="settings-desc">Control your profile visibility.</div>
              </div>
              <select class="settings-select" onchange="Settings.set('profileVisible', this.value)">
                <option value="everyone" ${s.profileVisible==='everyone'?'selected':''}>🌐 Everyone</option>
                <option value="friends"  ${s.profileVisible==='friends' ?'selected':''}>👥 Friends only</option>
                <option value="only-me"  ${s.profileVisible==='only-me' ?'selected':''}>🔒 Only me</option>
              </select>
            </div>

            <div class="settings-row">
              <div>
                <div class="settings-label">Show Online Status</div>
                <div class="settings-desc">Let friends see when you're active.</div>
              </div>
              <label class="toggle-switch">
                <input type="checkbox" ${s.showOnlineStatus ? 'checked' : ''} onchange="Settings.set('showOnlineStatus', this.checked)">
                <span class="toggle-track"><span class="toggle-thumb"></span></span>
              </label>
            </div>

            <div class="settings-row">
              <div>
                <div class="settings-label">Show Last Seen</div>
                <div class="settings-desc">Display when you were last online.</div>
              </div>
              <label class="toggle-switch">
                <input type="checkbox" ${s.showLastSeen ? 'checked' : ''} onchange="Settings.set('showLastSeen', this.checked)">
                <span class="toggle-track"><span class="toggle-thumb"></span></span>
              </label>
            </div>

            <div class="settings-row">
              <div>
                <div class="settings-label">Allow Friend Requests</div>
                <div class="settings-desc">Others can send you friend requests.</div>
              </div>
              <label class="toggle-switch">
                <input type="checkbox" ${s.allowFriendRequests ? 'checked' : ''} onchange="Settings.set('allowFriendRequests', this.checked)">
                <span class="toggle-track"><span class="toggle-thumb"></span></span>
              </label>
            </div>

            <div class="settings-row">
              <div>
                <div class="settings-label">Appear in Search</div>
                <div class="settings-desc">Allow others to find your profile.</div>
              </div>
              <label class="toggle-switch">
                <input type="checkbox" ${s.showInSearch ? 'checked' : ''} onchange="Settings.set('showInSearch', this.checked)">
                <span class="toggle-track"><span class="toggle-thumb"></span></span>
              </label>
            </div>
          </div>

          <!-- ── NOTIFICATIONS ── -->
          <div class="settings-card">
            <div class="settings-card-title">🔔 Notifications</div>

            ${[
              ['notifyFriendRequests', '👥 Friend Requests', 'Alert when someone adds you'],
              ['notifyMessages',       '💬 New Messages',    'Alert for incoming messages'],
              ['notifyLikes',          '💜 Likes',           'Alert when your posts are liked'],
              ['notifyComments',       '💭 Comments',        'Alert for new comments'],
              ['notifyGroupActivity',  '🌐 Group Activity',  'Updates from groups you joined'],
              ['soundEnabled',         '🔊 Sound Effects',   'Play sounds for notifications'],
            ].map(([key, label, desc]) => `
              <div class="settings-row">
                <div>
                  <div class="settings-label">${label}</div>
                  <div class="settings-desc">${desc}</div>
                </div>
                <label class="toggle-switch">
                  <input type="checkbox" ${s[key] ? 'checked' : ''} onchange="Settings.set('${key}', this.checked)">
                  <span class="toggle-track"><span class="toggle-thumb"></span></span>
                </label>
              </div>
            `).join('')}
          </div>

          <!-- ── FEED ── -->
          <div class="settings-card">
            <div class="settings-card-title">📰 Feed Preferences</div>

            <div class="settings-row">
              <div>
                <div class="settings-label">Autoplay Videos</div>
                <div class="settings-desc">Videos play automatically in the feed.</div>
              </div>
              <label class="toggle-switch">
                <input type="checkbox" ${s.autoplayVideos ? 'checked' : ''} onchange="Settings.set('autoplayVideos', this.checked)">
                <span class="toggle-track"><span class="toggle-thumb"></span></span>
              </label>
            </div>

            <div class="settings-row">
              <div>
                <div class="settings-label">Suggested Posts</div>
                <div class="settings-desc">Show posts from people you may know.</div>
              </div>
              <label class="toggle-switch">
                <input type="checkbox" ${s.showSuggestedPosts ? 'checked' : ''} onchange="Settings.set('showSuggestedPosts', this.checked)">
                <span class="toggle-track"><span class="toggle-thumb"></span></span>
              </label>
            </div>
          </div>

          <!-- ── ACCOUNT ── -->
          <div class="settings-card">
            <div class="settings-card-title">👤 Account</div>

            <div class="settings-row">
              <div>
                <div class="settings-label">Language</div>
              </div>
              <select class="settings-select" onchange="Settings.set('language', this.value)">
                <option value="en" ${s.language==='en'?'selected':''}>🇬🇧 English</option>
                <option value="ms" ${s.language==='ms'?'selected':''}>🇲🇾 Bahasa Melayu</option>
                <option value="zh" ${s.language==='zh'?'selected':''}>🇨🇳 中文</option>
                <option value="ja" ${s.language==='ja'?'selected':''}>🇯🇵 日本語</option>
                <option value="ko" ${s.language==='ko'?'selected':''}>🇰🇷 한국어</option>
              </select>
            </div>

            <div class="settings-row">
              <div>
                <div class="settings-label">Export My Data</div>
                <div class="settings-desc">Download a copy of your data.</div>
              </div>
              <button class="settings-btn" onclick="Settings.exportData()">📦 Export</button>
            </div>

            <div class="settings-row">
              <div>
                <div class="settings-label">Clear Cache</div>
                <div class="settings-desc">Free up local storage space.</div>
              </div>
              <button class="settings-btn" onclick="Settings.clearCache()">🧹 Clear</button>
            </div>

            <div class="settings-divider"></div>

            <div class="settings-row settings-danger-row">
              <div>
                <div class="settings-label settings-label-danger">Reset All Settings</div>
                <div class="settings-desc">Restore defaults. Cannot be undone.</div>
              </div>
              <button class="settings-btn settings-btn-danger" onclick="Settings._confirmReset()">🔄 Reset</button>
            </div>

            <div class="settings-row settings-danger-row">
              <div>
                <div class="settings-label settings-label-danger">Delete Account</div>
                <div class="settings-desc">Permanently remove your profile.</div>
              </div>
              <button class="settings-btn settings-btn-danger" onclick="Settings._confirmDelete()">🗑 Delete</button>
            </div>
          </div>

          <!-- ── ABOUT ── -->
          <div class="settings-card settings-about-card">
            <div class="settings-card-title">✨ About FriendSpace</div>
            <div class="settings-about">
              <div class="settings-about-logo">✨ FriendSpace</div>
              <div class="settings-about-ver">Version 1.0.0 · Made with 💜</div>
              <div class="settings-about-tagline">Your little corner of the internet.</div>
              <div class="settings-about-links">
                <a href="terms.html" target="_blank">Terms</a>
                <span>·</span>
                <a href="privacy.html" target="_blank">Privacy</a>
                <span>·</span>
                <a href="help.html" target="_blank">Help</a>
              </div>
            </div>
          </div>

        </div>
      </div>
    `;

    // Re-attach theme grid clicks
    this._bindThemeGrid();
  },

  _buildThemeGrid() {
    const s = this.current;
    return Object.entries(this.themes).map(([key, theme]) => {
      const vars = theme.vars;
      return `
        <button class="theme-chip${s.theme === key ? ' active' : ''}" data-theme="${key}"
          style="--chip-bg:${vars['--bg']};--chip-pri:${vars['--primary']};--chip-sec:${vars['--secondary']};--chip-acc:${vars['--accent']};"
          onclick="Settings.pickTheme('${key}', this)" title="${theme.label}">
          <span class="theme-swatch">
            <span style="background:${vars['--bg']}"></span>
            <span style="background:${vars['--primary']}"></span>
            <span style="background:${vars['--secondary']}"></span>
            <span style="background:${vars['--accent']}"></span>
          </span>
          <span class="theme-chip-label">${theme.label}</span>
          <span class="theme-chip-check">✓</span>
        </button>
      `;
    }).join('');
  },

  _bindThemeGrid() {
    // Clicks handled inline via onclick, nothing extra needed
  },

  pickTheme(key, btn) {
    this.set('theme', key);
    document.querySelectorAll('.theme-chip').forEach(c => c.classList.remove('active'));
    if (btn) btn.classList.add('active');
    if (typeof UI !== 'undefined') UI.toast(`Theme: ${this.themes[key].label}`, 'success');
  },

  _onSeg(settingKey, segId, btn) {
    const value = btn.dataset.value;
    this.set(settingKey, value);
    document.querySelectorAll(`#${segId} .seg-btn`).forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    if (typeof UI !== 'undefined') UI.toast(`${settingKey === 'fontSize' ? 'Font size' : 'Feed layout'} changed.`, 'info');
  },

  exportData() {
    const data = {
      settings: this.current,
      user: typeof AppState !== 'undefined' ? AppState.currentUser : {},
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = 'friendspace-data.json'; a.click();
    URL.revokeObjectURL(url);
    if (typeof UI !== 'undefined') UI.toast('Data exported! 📦', 'success');
  },

  clearCache() {
    try {
      const settingsBackup = localStorage.getItem('fs_settings');
      localStorage.clear();
      if (settingsBackup) localStorage.setItem('fs_settings', settingsBackup);
    } catch {}
    if (typeof UI !== 'undefined') UI.toast('Cache cleared! 🧹', 'success');
  },

  _confirmReset() {
    if (confirm('Reset all settings to defaults? This cannot be undone.')) {
      this.resetToDefaults();
    }
  },

  _confirmDelete() {
    if (confirm('⚠️ Delete your account? This is permanent and cannot be undone.')) {
      if (typeof UI !== 'undefined') UI.toast('Account deletion requested. Goodbye 💜', 'error');
    }
  },
};