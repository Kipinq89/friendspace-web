/**
 * KipinQ — Notification System Module
 */

window.KQNotif = (() => {
  let container = document.getElementById('kq-notif-container');
  let counter = 0;

  function init() {
    if (!container) {
      container = document.createElement('div');
      container.id = 'kq-notif-container';
      document.body.appendChild(container);
    }
  }

  function now() {
    return new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  }

  function show({ type = 'success', tag, title, msg, icon, duration = 4500, actions = [], typing = false, customIcon }) {
    init();
    counter++;
    const id = `kq-n-${counter}`;

    const card = document.createElement('div');
    card.className = `kq-notif type-${type}`;
    card.id = id;

    // Build icon HTML
    let iconHTML = '';
    if (customIcon) {
      iconHTML = customIcon;
    } else {
      iconHTML = `<span style="font-size:22px">${icon || '✨'}</span>`;
    }

    // Build actions HTML
    let actionsHTML = '';
    if (actions.length) {
      actionsHTML = `<div class="kq-notif-actions">
        ${actions.map((a, i) => `<button class="kq-notif-btn ${a.primary ? 'primary' : 'ghost'}" data-action="${i}">${a.label}</button>`).join('')}
      </div>`;
    }

    // Typing indicator
    let msgHTML = `<div class="kq-notif-msg">${msg || ''}</div>`;
    if (typing) {
      msgHTML = `<div class="kq-notif-msg" style="display:flex;align-items:center;">
        typing
        <span class="kq-typing"><span></span><span></span><span></span></span>
      </div>`;
    }

    card.innerHTML = `
      <div class="kq-notif-inner">
        <div class="kq-notif-icon">${iconHTML}</div>
        <div class="kq-notif-body">
          <div class="kq-notif-tag">${tag || type.toUpperCase()}</div>
          <div class="kq-notif-title">${title}</div>
          ${msgHTML}
          ${actionsHTML}
        </div>
      </div>
      <button class="kq-notif-close" aria-label="Close">×</button>
      <div class="kq-notif-time">${now()}</div>
      ${duration > 0 ? `<div class="kq-notif-progress" style="animation-duration:${duration}ms"></div>` : ''}
    `;

    container.prepend(card);

    // Close btn
    card.querySelector('.kq-notif-close').addEventListener('click', () => dismiss(card));

    // Action buttons
    actions.forEach((a, i) => {
      const btn = card.querySelector(`[data-action="${i}"]`);
      if (btn) btn.addEventListener('click', () => {
        if (a.onClick) a.onClick();
        dismiss(card);
      });
    });

    // Auto dismiss
    let timer;
    if (duration > 0) {
      timer = setTimeout(() => dismiss(card), duration);
    }

    // Pause on hover
    card.addEventListener('mouseenter', () => {
      clearTimeout(timer);
      const prog = card.querySelector('.kq-notif-progress');
      if (prog) prog.style.animationPlayState = 'paused';
    });
    card.addEventListener('mouseleave', () => {
      const prog = card.querySelector('.kq-notif-progress');
      if (prog) {
        prog.style.animationPlayState = 'running';
        if (duration > 0) timer = setTimeout(() => dismiss(card), 1200);
      }
    });

    return card;
  }

  function dismiss(card) {
    if (!card || !card.parentNode) return;
    card.classList.add('kq-hiding');
    card.addEventListener('animationend', () => card.remove(), { once: true });
  }

  // ── Helper functions for quick calls ──

  function friend(f, onAccept, onDecline) {
    return show({
      type: 'friend',
      tag:  'Friend Request',
      title: f.name || f.username,
      msg:  'wants to be your friend',
      icon: f.emoji || '👥',
      customIcon: `
        <span style="font-size:24px;line-height:1">${f.emoji || '👥'}</span>
        <span class="kq-dot"></span>
      `,
      duration: 8000,
      actions: [
        { label: '✅ Accept',  primary: true, onClick: onAccept },
        { label: '✗ Decline',  primary: false, onClick: onDecline },
      ]
    });
  }

  function message(m, onReply) {
    return show({
      type: 'message',
      tag:  'New Message',
      title: m.from || m.username,
      msg:  m.text,
      typing: m.typing || false,
      customIcon: `
        <span style="font-size:24px;line-height:1">${m.emoji || '💬'}</span>
        <span class="kq-dot"></span>
      `,
      duration: 6000,
      actions: [
        { label: '💬 Reply', primary: true, onClick: onReply },
        { label: 'Dismiss', primary: false },
      ]
    });
  }

  function success(title, msg) {
    return show({
      type: 'success',
      tag:  'Success',
      title: title,
      msg:  msg || '',
      customIcon: `
        <div class="kq-check-wrap">
          <div class="kq-check-circle"></div>
          <span class="kq-check-tick">✓</span>
        </div>
      `,
      duration: 3500,
    });
  }

  function warn(title, msg) {
    return show({
      type: 'warn',
      tag:  'Warning',
      title: title,
      msg:  msg || '',
      customIcon: `
        <div class="kq-pulse-ring"></div>
        <span style="font-size:22px;line-height:1;position:relative;z-index:1;">⚠️</span>
      `,
      duration: 5500,
      actions: [
        { label: 'OK', primary: true },
      ]
    });
  }

  return { show, dismiss, friend, message, success, warn };
})();
