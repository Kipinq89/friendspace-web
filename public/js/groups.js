/**
 * FriendSpace — Groups Module
 */

const Groups = {
  init() {
    this.renderGroups();
  },

  async renderGroups() {
    const view = document.getElementById('view-groups');
    if (!view) return;

    try {
      const res = await API.groups.list();
      const groups = res.groups || [];

      let html = `
        <div style="padding:20px; max-width:900px; margin:0 auto;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
            <h2 style="margin:0;">🌐 Groups</h2>
            <button class="btn btn-primary" onclick="Groups.showCreateModal()">+ Create Group</button>
          </div>
          
          <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(250px, 1fr)); gap:20px;">
      `;

      if (groups.length === 0) {
        html += `<div style="grid-column:1/-1; padding:30px; text-align:center; color:var(--muted); background:var(--surface); border-radius:12px;">No groups yet. Be the first to create one!</div>`;
      } else {
        groups.forEach(g => {
          html += `
            <div class="group-card" style="background:var(--surface); border-radius:12px; overflow:hidden; transition:transform 0.2s;">
              <div style="height:100px; background:${g.gradient || 'linear-gradient(135deg,#7B2FBE,#FF6B9D)'}; display:flex; align-items:center; justify-content:center; font-size:48px;">
                ${g.emoji || '🌐'}
              </div>
              <div style="padding:15px;">
                <h3 style="margin:0 0 10px 0; font-size:18px;">${g.name}</h3>
                <div style="color:var(--muted); font-size:13px; margin-bottom:15px; height:40px; overflow:hidden;">${g.desc || 'No description provided.'}</div>
                <div style="display:flex; justify-content:space-between; align-items:center; font-size:13px;">
                  <span style="color:var(--muted);">${g.member_count} members</span>
                  ${g.joined 
                    ? `<button class="btn btn-ghost btn-sm" onclick="Groups.leave('${g.id}')">Leave</button>` 
                    : `<button class="btn btn-primary btn-sm" onclick="Groups.join('${g.id}')">Join</button>`
                  }
                </div>
              </div>
            </div>
          `;
        });
      }

      html += `
          </div>
        </div>

        <!-- Create Group Modal -->
        <div id="create-group-modal" class="pf-modal-overlay pf-hidden" onclick="Groups.hideCreateModal()">
          <div class="pf-modal" onclick="event.stopPropagation()" style="width:400px;">
            <div class="pf-modal-title">Create New Group</div>
            
            <div class="pf-field" style="margin-top:15px;">
              <label>Group Name</label>
              <input type="text" id="group-name-input" class="input" placeholder="e.g. My Chem Fans">
            </div>
            
            <div class="pf-field">
              <label>Description</label>
              <textarea id="group-desc-input" class="input" rows="3" placeholder="What is this group about?"></textarea>
            </div>
            
            <div class="pf-field">
              <label>Emoji</label>
              <input type="text" id="group-emoji-input" class="input" placeholder="🎸">
            </div>

            <div style="display:flex; gap:10px; margin-top:20px;">
              <button class="btn btn-primary" onclick="Groups.createGroup()" style="flex:1;">Create</button>
              <button class="btn btn-ghost" onclick="Groups.hideCreateModal()" style="flex:1;">Cancel</button>
            </div>
          </div>
        </div>
      `;

      view.innerHTML = html;
    } catch (err) {
      console.error(err);
      view.innerHTML = `<div style="padding:20px; text-align:center; color:var(--danger);">Failed to load groups.</div>`;
    }
  },

  async join(groupId) {
    try {
      await API.groups.join(groupId);
      UI.toast('Joined group!', 'success');
      this.renderGroups();
    } catch (err) {
      UI.toast(err.message || 'Failed to join group', 'danger');
    }
  },

  async leave(groupId) {
    if (!confirm('Are you sure you want to leave this group?')) return;
    try {
      await API.groups.leave(groupId);
      UI.toast('Left group.', 'info');
      this.renderGroups();
    } catch (err) {
      UI.toast(err.message || 'Failed to leave group', 'danger');
    }
  },

  showCreateModal() {
    const modal = document.getElementById('create-group-modal');
    if (modal) modal.classList.remove('pf-hidden');
  },

  hideCreateModal() {
    const modal = document.getElementById('create-group-modal');
    if (modal) modal.classList.add('pf-hidden');
  },

  async createGroup() {
    const nameInput = document.getElementById('group-name-input');
    const descInput = document.getElementById('group-desc-input');
    const emojiInput = document.getElementById('group-emoji-input');
    
    if (!nameInput || !nameInput.value.trim()) {
      UI.toast('Group name is required.', 'warn');
      return;
    }

    try {
      await API.groups.create({
        name: nameInput.value.trim(),
        desc: descInput ? descInput.value.trim() : '',
        emoji: emojiInput ? emojiInput.value.trim() : '🌐'
      });
      
      UI.toast('Group created!', 'success');
      this.hideCreateModal();
      this.renderGroups();
    } catch (err) {
      UI.toast(err.message || 'Failed to create group', 'danger');
    }
  }
};