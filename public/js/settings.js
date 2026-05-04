/**
 * KipinQ — Settings Module
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

  // Theme categories for grouping in UI
  themeCategories: {
    'dark':  { label: '🌙 Dark',   themes: ['cosmic-purple','midnight-blue','obsidian','amoled'] },
    'neon':  { label: '⚡ Neon',   themes: ['cyber-punk','neon-tokyo','aurora','neon-lime'] },
    'soft':  { label: '🌸 Soft',   themes: ['rose-gold','peach-cream','lavender-dream','ocean-mist'] },
    'light': { label: '☀️ Light',  themes: ['clean-white','morning-sky'] },
  },

  // Theme presets — 14 total
  themes: {

    /* ── DARK ── */
    'cosmic-purple': {
      label: 'Cosmic Purple',
      emoji: '💜',
      desc:  'Deep space vibes',
      vars: {
        '--primary':   '#8B35D6',
        '--secondary': '#FF4D94',
        '--accent':    '#FFCC00',
        '--bg':        '#0f0720',
        '--surface':   '#1e1040',
        '--surface2':  '#2a1a56',
        '--surface3':  '#341f68',
        '--text':      '#eeddff',
        '--muted':     '#9b7cc4',
        '--border':    '#4a3280',
        '--online':    '#00FF88',
      },
    },
    'midnight-blue': {
      label: 'Midnight Blue',
      emoji: '🌊',
      desc:  'Ocean depths',
      vars: {
        '--primary':   '#2979FF',
        '--secondary': '#00E5FF',
        '--accent':    '#FFD740',
        '--bg':        '#03080f',
        '--surface':   '#071424',
        '--surface2':  '#0d1e35',
        '--surface3':  '#122846',
        '--text':      '#ddeeff',
        '--muted':     '#6b9fc4',
        '--border':    '#1a3a5c',
        '--online':    '#00E5FF',
      },
    },
    'obsidian': {
      label: 'Obsidian',
      emoji: '🖤',
      desc:  'Pure dark elegance',
      vars: {
        '--primary':   '#BB86FC',
        '--secondary': '#03DAC6',
        '--accent':    '#CF6679',
        '--bg':        '#060606',
        '--surface':   '#121212',
        '--surface2':  '#1e1e1e',
        '--surface3':  '#2a2a2a',
        '--text':      '#e0e0e0',
        '--muted':     '#888888',
        '--border':    '#333333',
        '--online':    '#03DAC6',
      },
    },
    'amoled': {
      label: 'AMOLED Black',
      emoji: '⬛',
      desc:  'True black, saves battery',
      vars: {
        '--primary':   '#E040FB',
        '--secondary': '#FF6D00',
        '--accent':    '#FFEA00',
        '--bg':        '#000000',
        '--surface':   '#0a0a0a',
        '--surface2':  '#141414',
        '--surface3':  '#1e1e1e',
        '--text':      '#ffffff',
        '--muted':     '#777777',
        '--border':    '#2a2a2a',
        '--online':    '#00E676',
      },
    },

    /* ── NEON ── */
    'cyber-punk': {
      label: 'Cyber Punk',
      emoji: '⚡',
      desc:  'Neon city nights',
      vars: {
        '--primary':   '#F500FF',
        '--secondary': '#00FFC8',
        '--accent':    '#FFE600',
        '--bg':        '#0d0015',
        '--surface':   '#160028',
        '--surface2':  '#200038',
        '--surface3':  '#2a0050',
        '--text':      '#ffe0ff',
        '--muted':     '#aa80cc',
        '--border':    '#5a0090',
        '--online':    '#00FFC8',
      },
    },
    'neon-tokyo': {
      label: 'Neon Tokyo',
      emoji: '🗼',
      desc:  'Akihabara glow',
      vars: {
        '--primary':   '#FF0066',
        '--secondary': '#0099FF',
        '--accent':    '#FF9900',
        '--bg':        '#06001a',
        '--surface':   '#0f0030',
        '--surface2':  '#180040',
        '--surface3':  '#220055',
        '--text':      '#ffeeff',
        '--muted':     '#9966bb',
        '--border':    '#440088',
        '--online':    '#00FF66',
      },
    },
    'aurora': {
      label: 'Aurora',
      emoji: '🌌',
      desc:  'Northern lights',
      vars: {
        '--primary':   '#00E5FF',
        '--secondary': '#76FF03',
        '--accent':    '#FF6D00',
        '--bg':        '#000d1a',
        '--surface':   '#001428',
        '--surface2':  '#001e3c',
        '--surface3':  '#002a50',
        '--text':      '#e0fff8',
        '--muted':     '#5599aa',
        '--border':    '#003355',
        '--online':    '#76FF03',
      },
    },
    'neon-lime': {
      label: 'Neon Lime',
      emoji: '💚',
      desc:  'Matrix terminal',
      vars: {
        '--primary':   '#39FF14',
        '--secondary': '#00FFCC',
        '--accent':    '#FFFF00',
        '--bg':        '#010a01',
        '--surface':   '#051505',
        '--surface2':  '#082008',
        '--surface3':  '#0a2a0a',
        '--text':      '#e0ffe0',
        '--muted':     '#50a050',
        '--border':    '#1a4a1a',
        '--online':    '#39FF14',
      },
    },

    /* ── SOFT ── */
    'rose-gold': {
      label: 'Rose Gold',
      emoji: '🌸',
      desc:  'Warm luxury tones',
      vars: {
        '--primary':   '#d4537e',
        '--secondary': '#e8a87c',
        '--accent':    '#f6d365',
        '--bg':        '#1c0a12',
        '--surface':   '#2e1220',
        '--surface2':  '#3e1a2c',
        '--surface3':  '#4e2238',
        '--text':      '#ffe4ef',
        '--muted':     '#c48fa8',
        '--border':    '#6b2e46',
        '--online':    '#ff9eb5',
      },
    },
    'peach-cream': {
      label: 'Peach Cream',
      emoji: '🍑',
      desc:  'Warm & cosy',
      vars: {
        '--primary':   '#E07040',
        '--secondary': '#F0A080',
        '--accent':    '#FFD080',
        '--bg':        '#1a0e08',
        '--surface':   '#2a1810',
        '--surface2':  '#3a2218',
        '--surface3':  '#4a2c20',
        '--text':      '#fff0e8',
        '--muted':     '#b08070',
        '--border':    '#5a3020',
        '--online':    '#90EE90',
      },
    },
    'lavender-dream': {
      label: 'Lavender',
      emoji: '🌷',
      desc:  'Soft pastel calm',
      vars: {
        '--primary':   '#9B59B6',
        '--secondary': '#85C1E9',
        '--accent':    '#F8C471',
        '--bg':        '#140e1e',
        '--surface':   '#201830',
        '--surface2':  '#2e2240',
        '--surface3':  '#3c2c50',
        '--text':      '#f0e8ff',
        '--muted':     '#9b88bb',
        '--border':    '#4a3870',
        '--online':    '#85C1E9',
      },
    },
    'ocean-mist': {
      label: 'Ocean Mist',
      emoji: '🌊',
      desc:  'Sea breeze serenity',
      vars: {
        '--primary':   '#2196F3',
        '--secondary': '#26C6DA',
        '--accent':    '#80DEEA',
        '--bg':        '#030e18',
        '--surface':   '#081828',
        '--surface2':  '#0e2238',
        '--surface3':  '#142c48',
        '--text':      '#e0f4ff',
        '--muted':     '#6090b0',
        '--border':    '#1a3a5a',
        '--online':    '#26C6DA',
      },
    },

    /* ── LIGHT ── */
    'clean-white': {
      label: 'Clean White',
      emoji: '☀️',
      desc:  'Minimal & bright',
      vars: {
        '--primary':   '#6200EE',
        '--secondary': '#e91e8c',
        '--accent':    '#f57c00',
        '--bg':        '#f5f5f5',
        '--surface':   '#ffffff',
        '--surface2':  '#ede7f6',
        '--surface3':  '#e8e0f5',
        '--text':      '#1a1a2e',
        '--muted':     '#7b5fa0',
        '--border':    '#d1c4e9',
        '--online':    '#00C853',
      },
    },
    'morning-sky': {
      label: 'Morning Sky',
      emoji: '🌤️',
      desc:  'Fresh blue light',
      vars: {
        '--primary':   '#0288D1',
        '--secondary': '#26C6DA',
        '--accent':    '#FF8F00',
        '--bg':        '#e8f4f8',
        '--surface':   '#ffffff',
        '--surface2':  '#deedf5',
        '--surface3':  '#cce3f0',
        '--text':      '#01204e',
        '--muted':     '#5588aa',
        '--border':    '#a0c8e0',
        '--online':    '#00C853',
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
          <div class="settings-subtitle">Customise your KipinQ experience</div>
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
            <div class="settings-card-title">✨ About KipinQ</div>
            <div class="settings-about">
              <div class="settings-about-logo">✨ KipinQ</div>
              <div class="settings-about-ver">Version 1.0.0 · Made with 💜</div>
              <div class="settings-about-tagline">Your little corner of the internet.</div>
              <div class="settings-about-links">
                <a href="terms.html" >Terms</a>
                <span>·</span>
                <a href="privacy.html" >Privacy</a>
                <span>·</span>
                <a href="help.html" >Help</a>
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
    let html = '';
    Object.entries(this.themeCategories).forEach(([catKey, cat]) => {
      html += `<div class="theme-category-label">${cat.label}</div>
               <div class="theme-category-row">`;
      cat.themes.forEach(key => {
        const theme = this.themes[key];
        if (!theme) return;
        const v = theme.vars;
        const isActive = s.theme === key;
        html += `
          <button class="theme-card${isActive ? ' active' : ''}" data-theme="${key}"
            onclick="Settings.pickTheme('${key}', this)" title="${theme.label} — ${theme.desc}">
            <div class="theme-card-preview" style="background:${v['--bg']};">
              <div class="tcp-bar" style="background:${v['--surface2']};"></div>
              <div class="tcp-post" style="background:${v['--surface']}; border-color:${v['--border']};">
                <div class="tcp-avatar" style="background:${v['--primary']};"></div>
                <div class="tcp-lines">
                  <div class="tcp-line tcp-l1" style="background:${v['--text']};"></div>
                  <div class="tcp-line tcp-l2" style="background:${v['--muted']};"></div>
                </div>
              </div>
              <div class="tcp-btn" style="background:${v['--secondary']};"></div>
              <div class="tcp-dot" style="background:${v['--online']};box-shadow:0 0 4px ${v['--online']};"></div>
            </div>
            <div class="theme-card-footer" style="background:${v['--surface']}; border-color:${v['--border']};">
              <span class="theme-card-emoji">${theme.emoji}</span>
              <div class="theme-card-info">
                <div class="theme-card-name" style="color:${v['--text']};">${theme.label}</div>
                <div class="theme-card-desc" style="color:${v['--muted']};">${theme.desc}</div>
              </div>
              <span class="theme-card-check" style="color:${v['--secondary']};">${isActive ? '✓' : ''}</span>
            </div>
          </button>`;
      });
      html += `</div>`;
    });
    return html;
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
    a.href = url; a.download = 'KipinQ-data.json'; a.click();
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