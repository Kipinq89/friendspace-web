/**
 * KipinQ — Feed Module
 * Handles: rendering posts, composing new posts, likes, sidebar widgets.
 */

const Feed = {

  async init() {
    await this.renderPosts();
    this.renderTop8();
    this.renderSuggestedFriends();
    this.renderTrendingNow();
    this.renderOnlineNow();
    this.renderActiveGroups();
    this.bindComposer();
  },

  /** Render all posts from Backend */
  async renderPosts() {
    const container = UI.$('posts-container');
    if (!container) return;
    container.innerHTML = '<div style="text-align:center;padding:20px;color:var(--muted);">Loading posts...</div>';
    
    try {
      if (typeof API === 'undefined') return;
      const data = await API.posts.getFeed();
      AppState.posts = data.posts || [];
      
      container.innerHTML = '';
      if (AppState.posts.length === 0) {
        container.innerHTML = '<div style="text-align:center;padding:20px;color:var(--muted);">No posts yet. Be the first to post!</div>';
        return;
      }
      
      AppState.posts.forEach(p => {
        // Map backend SQL row to what buildPostCard expects
        const mappedPost = {
          id: p.id,
          user: p.username || 'Unknown',
          emoji: p.emoji || '👤',
          time: new Date(p.created_at).toLocaleString(),
          mood: p.mood || '',
          text: p.text || '',
          likes: p.like_count || 0,
          liked: !!p.liked_by_me,
          comments: p.comment_count || 0,
          photos: p.photos || [],
          song: p.song || null,
          privacy: p.privacy || 'everyone'
        };
        container.appendChild(this.buildPostCard(mappedPost));
      });
    } catch (err) {
      console.error(err);
      container.innerHTML = '<div style="text-align:center;padding:20px;color:var(--danger);">Failed to load posts.</div>';
    }
  },

  /** Build a single post card DOM element */
  buildPostCard(post) {
    const card = UI.el('div', { cls: 'post-card', 'data-post-id': post.id });

    // Header
    const header = UI.el('div', { cls: 'post-header' });
    const av = UI.postAvatar(post.emoji);
    av.addEventListener('click', () => UI.showView('profile'));
    const meta = UI.el('div');
    const user = UI.el('div', { cls: 'post-user', text: post.user });
    user.addEventListener('click', () => UI.showView('profile'));
    const time = UI.el('div', { cls: 'post-time', text: `${post.time} • ${post.mood}` });
    meta.append(user, time);
    header.append(av, meta);

    // Privacy indicator
    if (post.privacy && post.privacy !== 'everyone') {
      const privacyIcon = post.privacy === 'friends' ? '👥' : '🔒';
      const privacyText = post.privacy === 'friends' ? 'Friends' : 'Private';
      const privacyEl = UI.el('div', { cls: 'post-privacy', title: `Visible to ${privacyText}`, text: privacyIcon });
      header.appendChild(privacyEl);
    }

    // Text
    const text = UI.el('div', { cls: 'post-text', text: post.text });

    // Optional photos
    let photosEl = null;
    if (post.photos && post.photos.length > 0) {
      photosEl = this.buildPhotoGrid(post.photos);
    }

    // Optional song
    let songEl = null;
    if (post.song) {
      songEl = UI.el('div', { cls: 'post-song', html: `🎵 Listening to: <strong>${post.song}</strong>` });
    }

    // Comments section
    const commentsEl = this.buildCommentsSection(post);

    // Actions
    const actions = UI.el('div', { cls: 'post-actions' });

    const likeBtn = UI.el('button', {
      cls: `action-btn${post.liked ? ' liked' : ''}`,
      html: `💜 Like <span class="like-count">${post.likes}</span>`,
    });
    likeBtn.addEventListener('click', () => this.toggleLike(post, likeBtn));

    const commentBtn = UI.el('button', {
      cls: 'action-btn',
      html: `💬 Comment ${Array.isArray(post.comments) ? post.comments.length : post.comments}`,
    });
    commentBtn.addEventListener('click', () => this.toggleComments(post, card));

    const shareBtn = UI.el('button', { cls: 'action-btn', text: '🔗 Share' });
    shareBtn.addEventListener('click', () => UI.toast('Link copied! ✨'));

    // Delete button for own posts
    let deleteBtn = null;
    if (post.user === AppState.currentUser.username) {
      deleteBtn = UI.el('button', { cls: 'action-btn delete-btn', text: '🗑 Delete' });
      deleteBtn.addEventListener('click', () => this.deletePost(post.id));
    }

    actions.append(likeBtn, commentBtn, shareBtn);
    if (deleteBtn) actions.appendChild(deleteBtn);

    card.append(header, text);
    if (photosEl) card.appendChild(photosEl);
    if (songEl)   card.appendChild(songEl);
    card.appendChild(actions);
    card.appendChild(commentsEl);

    return card;
  },

  /** Build comments section for a post */
  buildCommentsSection(post) {
    const commentsEl = UI.el('div', { cls: 'post-comments', style: 'display: none;' });

    // Existing comments
    if (Array.isArray(post.comments)) {
      post.comments.forEach(comment => {
        const commentEl = UI.el('div', { cls: 'comment-item' });
        const av = UI.el('div', { cls: 'comment-avatar', text: comment.emoji });
        const content = UI.el('div', { cls: 'comment-content' });
        const user = UI.el('div', { cls: 'comment-user', text: comment.user });
        const text = UI.el('div', { cls: 'comment-text', text: comment.text });
        const time = UI.el('div', { cls: 'comment-time', text: comment.time });
        content.append(user, text, time);
        commentEl.append(av, content);
        commentsEl.appendChild(commentEl);
      });
    }

    // Comment input
    const inputRow = UI.el('div', { cls: 'comment-input-row' });
    const input = UI.el('input', {
      cls: 'comment-input',
      type: 'text',
      placeholder: 'Write a comment...',
      'data-post-id': post.id
    });
    const btn = UI.el('button', {
      cls: 'comment-btn',
      text: 'Post',
      'data-post-id': post.id
    });
    btn.addEventListener('click', () => this.addComment(post.id, input));
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.addComment(post.id, input);
    });

    inputRow.append(input, btn);
    commentsEl.appendChild(inputRow);

    return commentsEl;
  },

  /** Toggle comments visibility */
  toggleComments(post, card) {
    const commentsEl = card.querySelector('.post-comments');
    if (commentsEl) {
      const isVisible = commentsEl.style.display !== 'none';
      commentsEl.style.display = isVisible ? 'none' : 'block';
      if (!isVisible) {
        // Focus the input when showing comments
        const input = commentsEl.querySelector('.comment-input');
        if (input) setTimeout(() => input.focus(), 100);
      }
    }
  },

  /** Add a comment to a post */
  async addComment(postId, inputEl) {
    const text = inputEl.value.trim();
    if (!text) return;

    try {
      await API.posts.addComment(postId, text);
      inputEl.value = '';
      this.renderPosts();
      UI.toast('Comment added! 💬', 'success');
    } catch (err) {
      UI.toast('Failed to add comment', 'danger');
    }
  },

  /** Delete a post */
  async deletePost(postId) {
    if (!confirm('Are you sure you want to delete this post?')) return;

    try {
      await API.posts.delete(postId);
      this.renderPosts();
      UI.toast('Post deleted.', 'info');
    } catch (err) {
      UI.toast('Failed to delete post.', 'danger');
    }
  },
  buildPhotoGrid(photos) {
    const cls = photos.length === 1 ? 'single' : photos.length === 2 ? 'double' : 'triple';
    const grid = UI.el('div', { cls: `post-photos ${cls}` });
    photos.forEach(src => {
      const item = UI.el('div', { cls: 'photo-item' });
      const img  = UI.el('img', { src, alt: 'photo' });
      const overlay = UI.el('div', { cls: 'photo-overlay', html: '🔍' });
      item.append(img, overlay);
      item.addEventListener('click', () => Photos.openLightbox(src));
      grid.appendChild(item);
    });
    return grid;
  },

  /** Toggle like state */
  async toggleLike(post, btn) {
    try {
      const res = await API.posts.toggleLike(post.id);
      post.liked = res.liked;
      post.likes += post.liked ? 1 : -1;
      btn.classList.toggle('liked', post.liked);
      btn.querySelector('.like-count').textContent = post.likes;
      UI.pulse(btn);
    } catch (err) {
      UI.toast('Failed to like', 'danger');
    }
  },

  /** Bind the status composer */
  bindComposer() {
    const textarea = UI.$('status-textarea');
    const postBtn  = UI.$('post-btn');
    const moodSel  = UI.$('mood-select');
    const photoBtn = UI.$('attach-photo-btn');

    // Attach photo triggers file picker
    if (photoBtn) {
      photoBtn.addEventListener('click', () => {
        const inp = document.createElement('input');
        inp.type = 'file';
        inp.accept = 'image/*';
        inp.multiple = true;
        inp.addEventListener('change', (e) => {
          const files = [...e.target.files];
          if (!files.length) return;
          photoBtn.classList.add('active');
          photoBtn.textContent = `📷 ${files.length} photo${files.length > 1 ? 's' : ''}`;
          this._pendingPhotos = files;
        });
        inp.click();
      });
    }

    postBtn.addEventListener('click', () => this.submitPost(textarea, moodSel));

    textarea.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && e.ctrlKey) this.submitPost(textarea, moodSel);
    });
  },

  _pendingPhotos: [],

  /** Add a new post to the feed */
  submitPost(textarea, moodSel) {
    const text  = textarea.value.trim();
    const mood  = moodSel.value;
    const photos = this._pendingPhotos;

    if (!text && photos.length === 0) {
      UI.toast('Write something first! ✍️', 'warn');
      return;
    }

    const readPhotos = (files) => {
      return Promise.all(files.map(f => new Promise(res => {
        const reader = new FileReader();
        reader.onload = e => res(e.target.result);
        reader.readAsDataURL(f);
      })));
    };

    readPhotos(photos).then(async photosData => {
      try {
        await API.posts.create({
          text,
          mood: mood || '😊 feeling good',
          song: null,
          privacy: Settings.current?.postVisible || 'everyone',
          photos: photosData
        });

        textarea.value = '';
        moodSel.value  = '';
        this._pendingPhotos = [];

        const photoBtn = UI.$('attach-photo-btn');
        if (photoBtn) {
          photoBtn.classList.remove('active');
          photoBtn.textContent = '📷 Photo';
        }

        UI.toast('Posted! ✨', 'success');
        this.renderPosts(); // Refresh feed
      } catch (err) {
        UI.toast('Failed to post', 'danger');
      }
    });
  },

  /** Render Top 8 sidebar grid */
  renderTop8() {
    const grid = UI.$('top8-grid');
    if (!grid) return;
    grid.innerHTML = '';
    AppState.currentUser.top8.forEach(friend => {
      const item = UI.el('div', { cls: 'top8-item' });
      const av = UI.el('div', {
        cls: 'top8-avatar',
        text: friend.emoji,
        style: `background:${friend.gradient};`,
      });
      const name = UI.el('div', { cls: 'top8-name', text: friend.name });
      item.append(av, name);
      item.addEventListener('click', () => UI.showView('profile'));
      grid.appendChild(item);
    });
  },

  /** Render "People You May Know" */
  renderSuggestedFriends() {
    const container = UI.$('suggested-friends');
    if (!container) return;

    // Mock suggestions - in a real app, this would come from an API
    const allSuggestions = [
      { name: 'butterfly_grl', emoji: '🦋' },
      { name: 'RockGod2005',   emoji: '🎸' },
      { name: 'emo_kid_88',    emoji: '😢' },
      { name: 'goth_princess', emoji: '👸' },
      { name: 'skater_boi',    emoji: '🛼' },
      { name: 'anime_fan',     emoji: '🎌' },
      { name: 'music_lover',   emoji: '🎵' },
      { name: 'dreamer_girl',  emoji: '💭' },
    ];

    // Filter out current friends
    const friends = AppState.friends || [];
    const friendNames = friends.map(f => f.username || f.name).filter(Boolean);
    const suggestions = allSuggestions.filter(s => !friendNames.includes(s.name)).slice(0, 4);

    container.innerHTML = '';
    if (suggestions.length === 0) {
      container.innerHTML = '<div style="text-align:center;color:var(--muted);padding:16px;">No new friend suggestions.</div>';
      return;
    }

    suggestions.forEach(s => {
      const row = UI.el('div', { style: 'display:flex;align-items:center;gap:8px;' });
      const av  = UI.el('div', { style: 'width:32px;height:32px;border-radius:50%;border:2px solid var(--border);display:flex;align-items:center;justify-content:center;font-size:14px;', text: s.emoji });
      const name = UI.el('div', { style: 'flex:1;font-size:12px;font-weight:700;', text: s.name });
      const btn  = UI.el('button', {
        style: 'font-size:11px;background:var(--surface2);border:1px solid var(--border);color:var(--text);border-radius:12px;padding:3px 10px;font-family:var(--font);font-weight:700;cursor:pointer;',
        text: '+ Add',
      });
      btn.addEventListener('click', () => {
        btn.textContent = '✓ Added';
        btn.style.background = 'var(--primary)';
        btn.style.borderColor = 'var(--primary)';
        btn.style.color = '#fff';
        UI.toast(`Friend request sent to ${s.name}! 💜`, 'success');
      });
      row.append(av, name, btn);
      container.appendChild(row);
    });
  },

  /** Render "Trending Now" */
  renderTrendingNow() {
    const container = UI.$('feed-trending');
    if (!container) return;

    const posts = AppState.posts || [];
    const hashtagCounts = {};

    // Count hashtags from post texts
    posts.forEach(post => {
      const text = post.text || '';
      const hashtags = text.match(/#[\w]+/g) || [];
      hashtags.forEach(tag => {
        hashtagCounts[tag] = (hashtagCounts[tag] || 0) + 1;
      });
    });

    // Sort by count descending
    const sortedTrends = Object.entries(hashtagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    container.innerHTML = '';
    if (sortedTrends.length === 0) {
      container.innerHTML = '<div style="text-align:center;color:var(--muted);padding:16px;">No trending topics yet.</div>';
      return;
    }

    sortedTrends.forEach(([tag, count]) => {
      const item = UI.el('div', { cls: 'trend-item' });
      item.addEventListener('click', () => this.clickTrend(item));
      const tagText = UI.el('span', { text: tag });
      const countEl = UI.el('span', { cls: 'trend-count', text: UI.fmtNum(count) });
      item.append(tagText, countEl);
      container.appendChild(item);
    });
  },

  async renderOnlineNow() {
    const container = UI.$('online-now-list');
    if (!container) return;

    let friends = AppState.friends || [];
    if (friends.length === 0 && typeof API !== 'undefined' && API.friends) {
      try {
        const res = await API.friends.list();
        friends = res.friends || [];
        AppState.friends = friends;
      } catch (err) {
        console.warn('Failed to fetch online friends', err);
      }
    }

    if (!friends.length) {
      container.innerHTML = '<div style="text-align:center;color:var(--muted);padding:20px;">No friends are currently online.</div>';
      return;
    }

    container.innerHTML = '';
    friends.slice(0, 3).forEach(friend => {
      const onlineUser = UI.el('div', { cls: 'online-user' });
      onlineUser.addEventListener('click', () => UI.showView('messages'));
      const avatar = UI.el('div', { cls: 'online-avatar', text: friend.emoji || '😎' });
      const info = UI.el('div');
      const name = UI.el('div', { cls: 'online-name', text: friend.username || friend.name || 'Friend' });
      const status = UI.el('div', { cls: 'online-status', text: friend.user_status || 'Online now' });
      info.append(name, status);
      onlineUser.append(avatar, info);
      container.appendChild(onlineUser);
    });
  },

  async renderActiveGroups() {
    const container = UI.$('active-groups-list');
    if (!container) return;

    let groups = AppState.groups || [];
    if (groups.length === 0 && typeof API !== 'undefined' && API.groups) {
      try {
        const res = await API.groups.list();
        groups = res.groups || res.data || (Array.isArray(res) ? res : []);
        AppState.groups = groups;
      } catch (err) {
        console.warn('Failed to fetch groups', err);
      }
    }

    if (!groups.length) {
      container.innerHTML = '<div style="text-align:center;color:var(--muted);padding:20px;">No active groups to display.</div>';
      return;
    }

    const activeGroups = groups
      .slice()
      .sort((a, b) => (b.member_count || 0) - (a.member_count || 0))
      .slice(0, 3);

    container.innerHTML = '';
    activeGroups.forEach(group => {
      const item = UI.el('div', { cls: 'feed-group-item' });
      item.addEventListener('click', () => {
        if (typeof Groups !== 'undefined' && typeof Groups.openGroup === 'function') {
          Groups.openGroup(group.id);
        } else {
          UI.showView('groups');
        }
      });
      const av = UI.el('div', { cls: 'feed-group-av', text: group.emoji || '🌐' });
      av.style.background = group.gradient || 'linear-gradient(135deg,#4a0080,#FF6B9D)';
      const info = UI.el('div', { cls: 'feed-group-info' });
      const name = UI.el('div', { cls: 'feed-group-name', text: group.name || 'Unnamed Group' });
      const statText = `${UI.fmtNum(group.member_count || 0)} members${group.post_count != null ? ' · ' + UI.fmtNum(group.post_count) + ' posts' : ''}`;
      const stats = UI.el('div', { cls: 'feed-group-stat', text: statText });
      info.append(name, stats);
      item.append(av, info);
      container.appendChild(item);
    });
  },
};

/** Feed Sidebar Widgets Logic */
const FeedSidebar = {
  vibes: [
    { q: "Not all those who wander are lost.", a: "J.R.R. Tolkien" },
    { q: "To be, or not to be, that is the question.", a: "William Shakespeare" },
    { q: "I think, therefore I am.", a: "René Descartes" },
    { q: "The only limit to our realization of tomorrow is our doubts of today.", a: "Franklin D. Roosevelt" },
    { q: "Stay hungry, stay foolish.", a: "Steve Jobs" }
  ],
  currentVibeIndex: 0,
  
  nextVibe() {
    this.currentVibeIndex = (this.currentVibeIndex + 1) % this.vibes.length;
    const vibe = this.vibes[this.currentVibeIndex];
    const quoteEl = document.getElementById('vibe-quote');
    const authorEl = document.querySelector('.vibe-author');
    if (quoteEl && authorEl) {
      quoteEl.style.opacity = '0';
      authorEl.style.opacity = '0';
      setTimeout(() => {
        quoteEl.textContent = `"${vibe.q}"`;
        authorEl.textContent = `— ${vibe.a}`;
        quoteEl.style.opacity = '1';
        authorEl.style.opacity = '1';
        quoteEl.style.transition = 'opacity 0.3s ease';
        authorEl.style.transition = 'opacity 0.3s ease';
      }, 300);
    }
  },
  
  clickTrend(el) {
    if (typeof UI !== 'undefined') {
      // Find the text excluding the child span (trend-count)
      let text = '';
      for (let i = 0; i < el.childNodes.length; i++) {
        if (el.childNodes[i].nodeType === 3) { // text node
          text += el.childNodes[i].nodeValue;
        }
      }
      UI.toast(`Viewing trending topic: ${text.trim()}`, 'info');
    }
  }
};