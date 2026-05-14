/**
 * KipinQ — UI Utilities
 * Reusable DOM helpers, element builders, and small utilities.
 */

const UI = {

  /** Get element by id */
  $: (id) => document.getElementById(id),

  /** Query selector */
  $$: (sel, parent = document) => parent.querySelector(sel),

  /** Query all */
  $$$: (sel, parent = document) => [...parent.querySelectorAll(sel)],

  /** Create element with optional props + children */
  el(tag, props = {}, ...children) {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(props)) {
      if (k === 'cls')       e.className = v;
      else if (k === 'html') e.innerHTML = v;
      else if (k === 'text') e.textContent = v;
      else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
      else                   e.setAttribute(k, v);
    }
    children.forEach(c => {
      if (typeof c === 'string') e.appendChild(document.createTextNode(c));
      else if (c) e.appendChild(c);
    });
    return e;
  },

  /** Show a view and update nav */
  showView(name) {
    UI.$$$('.view').forEach(v => v.classList.remove('active'));
    UI.$$$('.nav-btn').forEach(b => b.classList.remove('active'));
    UI.$$$('.menu-item').forEach(m => m.classList.remove('active'));
    UI.$$$('.bottom-nav-item').forEach(b => b.classList.remove('active'));

    const view = UI.$(`view-${name}`);
    if (view) view.classList.add('active');

    const navBtn = UI.$$(`[data-view="${name}"]`);
    if (navBtn) navBtn.classList.add('active');

    const menuItem = UI.$$(`[data-menu="${name}"]`);
    if (menuItem) menuItem.classList.add('active');

    const bottomNavItem = UI.$$(`.bottom-nav-item[data-view="${name}"]`);
    if (bottomNavItem) bottomNavItem.classList.add('active');

    // Module-specific init
    if (name === 'groups' && typeof Groups !== 'undefined') Groups.renderBrowse();
  },

  /** Set sidebar active menu item */
  setMenuActive(el) {
    UI.$$$('.menu-item').forEach(m => m.classList.remove('active'));
    el.classList.add('active');
  },

  /** Format numbers compactly */
  fmtNum(n) {
    if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
    return String(n);
  },

  /** Random item from array */
  randomItem(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  },

  /** Animate element briefly */
  pulse(el) {
    el.style.transform = 'scale(1.15)';
    setTimeout(() => el.style.transform = '', 200);
  },

  /** Toast notification */
  toast(msg, type = 'info') {
    const colors = {
      info:    'var(--primary)',
      success: 'var(--success)',
      warn:    'var(--accent)',
      error:   'var(--danger)',
    };
    const t = UI.el('div', {
      html: msg,
      style: `
        position: fixed; bottom: 24px; right: 24px; z-index: 999;
        background: ${colors[type] || colors.info};
        color: #fff; padding: 10px 18px; border-radius: 20px;
        font-family: var(--font); font-size: 13px; font-weight: 700;
        box-shadow: 0 4px 16px rgba(0,0,0,0.4);
        animation: fadeIn 0.2s ease;
        pointer-events: none;
      `,
    });
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 2600);
  },

  /** Build a post avatar circle */
  postAvatar(emoji, size = 42) {
    return UI.el('div', {
      cls: 'post-avatar',
      text: emoji,
      style: `width:${size}px;height:${size}px;font-size:${Math.round(size * 0.48)}px;`,
    });
  },

  /** Render an emoji or image avatar as HTML */
  renderAvatar(value, size = 42, radius = '50%') {
    const candidate = value || '';
    if (candidate && (candidate.startsWith('data:') || candidate.includes('://') || candidate.startsWith('/'))) {
      return `<img src="${candidate}" alt="Avatar" style="width:${size}px;height:${size}px;object-fit:cover;border-radius:${radius};" onerror="this.style.display='none';this.nextSibling.style.display='inline-block';"><span style="display:none;">😎</span>`;
    }
    return candidate || '😎';
  },

  /** Render a gradient emoji avatar (for top8, groups, etc.) */
  gradientEmoji(emoji, size, radius, gradient, extraStyle = '') {
    return UI.el('div', {
      style: `
        width:${size}px;height:${size}px;border-radius:${radius};
        background:${gradient};
        display:flex;align-items:center;justify-content:center;
        font-size:${Math.round(size * 0.44)}px;
        flex-shrink:0;
        ${extraStyle}
      `,
      text: emoji,
    });
  },
};