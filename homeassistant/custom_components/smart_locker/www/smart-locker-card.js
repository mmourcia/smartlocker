const LOCKER_STATES = {
  libre:         { color: '#4CAF50', icon: 'mdi:lock-open-variant', label: 'Libre' },
  'occupé':      { color: '#2196F3', icon: 'mdi:lock',               label: 'Occupé' },
  en_attente:    { color: '#FF9800', icon: 'mdi:account-clock',      label: 'En attente' },
  'récupéré':    { color: '#00BCD4', icon: 'mdi:check-circle',       label: 'Récupéré' },
  hors_service:  { color: '#F44336', icon: 'mdi:alert-circle',       label: 'Hors service' },
};

const CSS = `
  :host { display: block; }
  ha-card { padding: 12px 16px 14px; }

  .header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 10px;
  }
  .icon-wrap {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 42px;
    height: 42px;
    border-radius: 50%;
    flex-shrink: 0;
  }
  .icon-wrap ha-icon { --mdc-icon-size: 26px; }
  .title { flex: 1; min-width: 0; }
  .name { font-size: 1em; font-weight: 600; }
  .badges {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-top: 3px;
    flex-wrap: wrap;
  }
  .state-badge, .door-badge {
    display: inline-flex;
    align-items: center;
    gap: 2px;
    font-size: 0.72em;
    padding: 1px 8px;
    border-radius: 10px;
    font-weight: 500;
  }
  .door-badge ha-icon { --mdc-icon-size: 12px; color: inherit; }
  .retrieved-at {
    font-size: 0.7em;
    color: var(--secondary-text-color);
    margin-top: 1px;
  }
  .pin-row {
    display: none;
    align-items: center;
    gap: 5px;
    font-size: 0.78em;
    color: var(--secondary-text-color);
    margin-bottom: 8px;
    letter-spacing: 2px;
    font-family: monospace;
  }
  .pin-row ha-icon { --mdc-icon-size: 13px; color: inherit; }

  /* Badges utilisateurs assignés */
  .users {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    min-height: 22px;
    margin-bottom: 10px;
  }
  .user-badge {
    display: inline-flex;
    flex-direction: column;
    gap: 1px;
    font-size: 0.8em;
    padding: 3px 6px 3px 10px;
    border-radius: 12px;
    background: var(--primary-color, #2196F3);
    color: white;
    font-weight: 500;
  }
  .user-badge-top {
    display: flex;
    align-items: center;
    gap: 4px;
  }
  .user-badge-notif {
    display: flex;
    align-items: center;
    gap: 2px;
    font-size: 0.82em;
    font-weight: 400;
    opacity: 0.88;
    padding-bottom: 1px;
  }
  .user-badge-notif ha-icon { --mdc-icon-size: 10px; color: inherit; }
  .user-badge-remove {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 16px;
    height: 16px;
    border: none;
    border-radius: 50%;
    background: rgba(255,255,255,0.3);
    color: white;
    cursor: pointer;
    font-size: 0.85em;
    line-height: 1;
    padding: 0;
    flex-shrink: 0;
  }
  .user-badge-remove:hover { background: rgba(255,255,255,0.55); }
  .no-users { font-size: 0.82em; color: var(--secondary-text-color); align-self: center; }

  /* Boutons d'action */
  .actions {
    display: flex;
    gap: 6px;
    margin-bottom: 10px;
  }
  .btn {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    padding: 5px 6px;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 0.78em;
    font-weight: 500;
    background: var(--secondary-background-color);
    color: var(--primary-text-color);
    transition: background 0.15s, color 0.15s;
  }
  .btn ha-icon { --mdc-icon-size: 15px; color: inherit; }
  .btn:hover { background: var(--primary-color); color: white; }

  /* Ligne d'assignation */
  .assign-row {
    display: flex;
    gap: 6px;
    align-items: center;
  }
  .assign-row select {
    flex: 1;
    min-width: 0;
    padding: 5px 8px;
    border: 1px solid var(--divider-color);
    border-radius: 6px;
    background: var(--card-background-color);
    color: var(--primary-text-color);
    font-size: 0.82em;
    outline: none;
    cursor: pointer;
  }
  .assign-row select:focus { border-color: var(--primary-color); }
  .icon-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    background: var(--secondary-background-color);
    color: var(--primary-text-color);
    flex-shrink: 0;
    transition: background 0.15s, color 0.15s;
  }
  .icon-btn ha-icon { --mdc-icon-size: 18px; color: inherit; }
  .icon-btn:hover { background: var(--primary-color); color: white; }
`;

class SmartLockerCardEditor extends HTMLElement {
  setConfig(config) {
    this._config = config;
    this._render();
  }
  _render() {
    this.innerHTML = `
      <div style="padding:12px 16px;">
        <label style="display:flex;align-items:center;gap:10px;font-size:0.9em;">
          <span style="flex-shrink:0;">Numéro de casier</span>
          <select style="flex:1;padding:5px 8px;border-radius:6px;border:1px solid #ccc;font-size:1em;">
            ${[1,2,3,4,5,6,7,8].map(i =>
              `<option value="${i}" ${(this._config || {}).locker_id == i ? 'selected' : ''}>${i}</option>`
            ).join('')}
          </select>
        </label>
      </div>
    `;
    this.querySelector('select').onchange = e => {
      this.dispatchEvent(new CustomEvent('config-changed', {
        detail: { config: { ...this._config, locker_id: Number(e.target.value) } },
        bubbles: true, composed: true,
      }));
    };
  }
}
customElements.define('smart-locker-card-editor', SmartLockerCardEditor);

class SmartLockerCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._recipients = [];
    this._recipientsFetched = false;
  }

  static getConfigElement() { return document.createElement('smart-locker-card-editor'); }
  static getStubConfig()    { return { locker_id: 1 }; }

  setConfig(config) {
    if (!config.locker_id) throw new Error('locker_id requis');
    this._lockerId = Number(config.locker_id);
    this._entityId = `smart_locker.casier_${this._lockerId}`;
    this._doorEntityId = `binary_sensor.smart_locker_relais_porte_casier_${this._lockerId}`;
    this._buildCard();
  }

  _buildCard() {
    const sr = this.shadowRoot;
    sr.innerHTML = `
      <style>${CSS}</style>
      <ha-card>
        <div class="header">
          <div class="icon-wrap" id="icon-wrap">
            <ha-icon id="state-icon"></ha-icon>
          </div>
          <div class="title">
            <div class="name">Casier ${this._lockerId}</div>
            <div class="badges">
              <div class="state-badge" id="state-badge"></div>
              <div class="door-badge" id="door-badge">
                <ha-icon id="door-icon"></ha-icon>
                <span id="door-label"></span>
              </div>
            </div>
            <div class="retrieved-at" id="retrieved-at"></div>
          </div>
        </div>
        <div class="pin-row" id="pin-row">
          <ha-icon icon="mdi:dialpad"></ha-icon>
          <span id="pin-code"></span>
        </div>
        <div class="users" id="users"></div>
        <div class="actions">
          <button class="btn" id="btn-open">
            <ha-icon icon="mdi:lock-open-variant"></ha-icon>Ouvrir
          </button>
          <button class="btn" id="btn-notify">
            <ha-icon icon="mdi:email-fast"></ha-icon>Notifier
          </button>
          <button class="btn" id="btn-reset">
            <ha-icon icon="mdi:lock-reset"></ha-icon>Libérer
          </button>
        </div>
        <div class="assign-row">
          <select id="user-select">
            <option value="">-- Choisir un destinataire --</option>
          </select>
          <button class="icon-btn" id="btn-assign" title="Assigner">
            <ha-icon icon="mdi:account-plus"></ha-icon>
          </button>
        </div>
      </ha-card>
    `;

    sr.getElementById('btn-open').onclick   = () => this._svc('open',   {});
    sr.getElementById('btn-notify').onclick = () => this._svc('notify', {});
    sr.getElementById('btn-reset').onclick  = () => this._svc('reset',  {});
    sr.getElementById('btn-assign').onclick = () => this._assignUser();
  }

  set hass(hass) {
    this._hass = hass;
    if (!this._recipientsFetched) {
      this._recipientsFetched = true;
      this._fetchRecipients();
    }
    this._update();
  }

  async _fetchRecipients() {
    try {
      const list = await this._hass.callWS({ type: 'smart_locker/recipients/list' });
      this._recipients = list.sort((a, b) =>
        `${a.last_name} ${a.first_name}`.localeCompare(`${b.last_name} ${b.first_name}`)
      );
      this._populateSelect();
    } catch (_) {}
  }

  _populateSelect() {
    const select = this.shadowRoot.getElementById('user-select');
    if (!select) return;
    const current = select.value;
    select.innerHTML = '<option value="">-- Choisir un destinataire --</option>' +
      this._recipients.map(r =>
        `<option value="${r.first_name} ${r.last_name}">${r.last_name} ${r.first_name}</option>`
      ).join('');
    select.value = current;
  }

  _update() {
    const sr = this.shadowRoot;
    if (!this._hass || !sr.getElementById('state-icon')) return;

    const entity = this._hass.states[this._entityId];
    if (!entity) return;

    const state = entity.state;
    const users = entity.attributes.assigned_users || [];
    const cfg = LOCKER_STATES[state] || { color: '#9E9E9E', icon: 'mdi:help', label: state };

    // Etat métier
    sr.getElementById('state-icon').setAttribute('icon', cfg.icon);
    sr.getElementById('state-icon').style.color = cfg.color;
    sr.getElementById('icon-wrap').style.background = cfg.color + '22';
    sr.getElementById('state-badge').textContent = cfg.label;
    sr.getElementById('state-badge').style.background = cfg.color + '22';
    sr.getElementById('state-badge').style.color = cfg.color;

    // Date de récupération (visible uniquement si état = récupéré)
    const retrievedEl = sr.getElementById('retrieved-at');
    const retrievedAt = entity.attributes.retrieved_at;
    retrievedEl.textContent = (state === 'récupéré' && retrievedAt) ? `Récupéré le ${retrievedAt}` : '';

    // Code PIN (visible si casier occupé ou en attente)
    const pinRow = sr.getElementById('pin-row');
    const pinCode = entity.attributes.pin_code;
    if (pinCode && (state === 'occupé' || state === 'en_attente')) {
      sr.getElementById('pin-code').textContent = `${pinCode.slice(0, 3)}-${pinCode.slice(3)}`;
      pinRow.style.display = 'flex';
    } else {
      pinRow.style.display = 'none';
    }

    // Etat physique de la porte
    const doorEntity = this._hass.states[this._doorEntityId];
    const doorBadge = sr.getElementById('door-badge');
    if (doorEntity) {
      const isOpen = doorEntity.state === 'on';
      const doorColor = isOpen ? '#FF9800' : '#9E9E9E';
      doorBadge.style.background = doorColor + '22';
      doorBadge.style.color = doorColor;
      sr.getElementById('door-icon').setAttribute('icon', isOpen ? 'mdi:door-open' : 'mdi:door-closed');
      sr.getElementById('door-label').textContent = isOpen ? 'Ouverte' : 'Fermée';
      doorBadge.style.display = 'inline-flex';
    } else {
      doorBadge.style.display = 'none';
    }

    // Badges utilisateurs avec bouton de désassignation
    const usersEl = sr.getElementById('users');
    const notifiedAt = entity.attributes.notified_at || {};
    usersEl.innerHTML = '';
    if (users.length) {
      users.forEach(u => {
        const badge = document.createElement('div');
        badge.className = 'user-badge';

        const top = document.createElement('div');
        top.className = 'user-badge-top';
        const name = document.createElement('span');
        name.textContent = u;
        const removeBtn = document.createElement('button');
        removeBtn.className = 'user-badge-remove';
        removeBtn.textContent = '×';
        removeBtn.title = `Retirer ${u}`;
        removeBtn.onclick = () => this._svc('unassign', { user: u });
        top.appendChild(name);
        top.appendChild(removeBtn);
        badge.appendChild(top);

        const notifTime = notifiedAt[u];
        if (notifTime) {
          const notifEl = document.createElement('div');
          notifEl.className = 'user-badge-notif';
          notifEl.innerHTML = `<ha-icon icon="mdi:bell"></ha-icon>${notifTime}`;
          badge.appendChild(notifEl);
        }

        usersEl.appendChild(badge);
      });
    } else {
      const empty = document.createElement('span');
      empty.className = 'no-users';
      empty.textContent = 'Aucun assigné';
      usersEl.appendChild(empty);
    }
  }

  _svc(service, extra) {
    this._hass.callService('smart_locker', service, { locker_id: this._lockerId, ...extra });
  }

  _assignUser() {
    const select = this.shadowRoot.getElementById('user-select');
    const user = select.value.trim();
    if (!user) return;
    this._svc('assign', { user });
    select.value = '';
  }

  getCardSize() { return 3; }
}

customElements.define('smart-locker-card', SmartLockerCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type:        'smart-locker-card',
  name:        'Smart Locker — Casier',
  description: 'État, assignation et ouverture d\'un casier',
  preview:     false,
});

// ─── Carte gestion des destinataires ────────────────────────────────────────

const RCSS = `
  :host { display: block; }
  ha-card { padding: 12px 16px 16px; }

  .card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 14px;
  }
  .card-title {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 1.05em;
    font-weight: 600;
  }
  .card-title ha-icon { --mdc-icon-size: 20px; color: var(--primary-color); }

  /* Paramètres */
  .settings-row {
    display: flex;
    align-items: center;
    gap: 8px;
    background: var(--secondary-background-color);
    border-radius: 8px;
    padding: 8px 12px;
    margin-bottom: 14px;
    font-size: 0.83em;
  }
  .settings-label {
    color: var(--secondary-text-color);
    font-weight: 500;
    white-space: nowrap;
  }
  .settings-value { flex: 1; color: var(--primary-text-color); min-width: 0; }
  .settings-input {
    flex: 1;
    padding: 5px 8px;
    border: 1px solid var(--primary-color);
    border-radius: 6px;
    background: var(--card-background-color);
    color: var(--primary-text-color);
    font-size: 1em;
    outline: none;
    min-width: 0;
  }

  table { width: 100%; border-collapse: collapse; font-size: 0.83em; }
  th {
    text-align: left;
    padding: 5px 8px;
    border-bottom: 2px solid var(--divider-color);
    color: var(--secondary-text-color);
    font-weight: 600;
    white-space: nowrap;
  }
  td {
    padding: 8px;
    border-bottom: 1px solid var(--divider-color);
    vertical-align: middle;
    word-break: break-word;
  }
  tr:last-child td { border-bottom: none; }
  tbody tr:hover td { background: var(--secondary-background-color); }
  .col-actions { white-space: nowrap; text-align: right; width: 1%; }
  .empty { text-align: center; color: var(--secondary-text-color); padding: 20px 8px; }

  .r-icon-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    background: transparent;
    color: var(--secondary-text-color);
    padding: 0;
    transition: background 0.15s, color 0.15s;
  }
  .r-icon-btn ha-icon { --mdc-icon-size: 16px; color: inherit; }
  .r-icon-btn:hover { background: var(--primary-color); color: white; }
  .r-icon-btn.del:hover { background: #F44336; }

  .btn-add {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 5px 12px;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 0.82em;
    font-weight: 500;
    background: var(--primary-color);
    color: white;
    transition: opacity 0.15s;
  }
  .btn-add ha-icon { --mdc-icon-size: 15px; color: inherit; }
  .btn-add:hover { opacity: 0.85; }

  .form {
    background: var(--secondary-background-color);
    border-radius: 8px;
    padding: 12px 14px;
    margin-bottom: 14px;
  }
  .form-title { font-size: 0.88em; font-weight: 600; margin-bottom: 10px; }
  .form-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    margin-bottom: 10px;
  }
  .field { display: flex; flex-direction: column; gap: 3px; }
  .field label { font-size: 0.75em; color: var(--secondary-text-color); font-weight: 500; }
  .field input {
    padding: 6px 8px;
    border: 1px solid var(--divider-color);
    border-radius: 6px;
    background: var(--card-background-color);
    color: var(--primary-text-color);
    font-size: 0.85em;
    outline: none;
    transition: border-color 0.15s;
  }
  .field input:focus { border-color: var(--primary-color); }
  .field input.err { border-color: #F44336; }
  .form-actions { display: flex; justify-content: flex-end; gap: 8px; }

  /* Sélecteur de services de notification */
  .svc-label {
    font-size: 0.75em;
    color: var(--secondary-text-color);
    font-weight: 500;
    margin-bottom: 4px;
  }
  .svc-list {
    display: flex;
    flex-wrap: wrap;
    gap: 5px;
    margin-bottom: 10px;
  }
  .svc-check {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 0.78em;
    padding: 3px 8px;
    border-radius: 12px;
    border: 1px solid var(--divider-color);
    cursor: pointer;
    user-select: none;
    background: var(--card-background-color);
    transition: background 0.15s, border-color 0.15s;
  }
  .svc-check input { display: none; }
  .svc-check.active {
    background: var(--primary-color);
    border-color: var(--primary-color);
    color: white;
  }

  /* Badges services dans le tableau */
  .svc-badges { display: flex; flex-wrap: wrap; gap: 3px; }
  .svc-badge {
    font-size: 0.7em;
    padding: 1px 6px;
    border-radius: 8px;
    background: var(--primary-color);
    color: white;
    white-space: nowrap;
  }
  .svc-badge-none { font-size: 0.75em; color: var(--secondary-text-color); }

  .r-btn {
    padding: 6px 14px;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 0.82em;
    font-weight: 500;
    transition: opacity 0.15s;
  }
  .r-btn:hover { opacity: 0.85; }
  .r-btn-primary { background: var(--primary-color); color: white; }
  .r-btn-secondary {
    background: var(--card-background-color);
    color: var(--primary-text-color);
    border: 1px solid var(--divider-color);
  }
`;

class SmartLockerRecipientsCard extends HTMLElement {
  static getStubConfig() { return {}; }
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._recipients = [];
    this._settings = {};
    this._loaded = false;
  }

  setConfig(config) {
    this._config = config || {};
    this._render();
  }

  _render() {
    this.shadowRoot.innerHTML = `
      <style>${RCSS}</style>
      <ha-card>
        <div class="card-header">
          <div class="card-title">
            <ha-icon icon="mdi:account-group"></ha-icon>
            Destinataires
          </div>
          <button class="btn-add" id="btn-add">
            <ha-icon icon="mdi:plus"></ha-icon>Ajouter
          </button>
        </div>
        <div class="settings-row" id="settings-row">
          <ha-icon icon="mdi:email-outline" style="--mdc-icon-size:16px;color:var(--secondary-text-color);flex-shrink:0;"></ha-icon>
          <span class="settings-label">Objet des notifs&nbsp;:</span>
          <span class="settings-value" id="settings-value">…</span>
          <button class="r-icon-btn" id="settings-edit" title="Modifier l'objet">
            <ha-icon icon="mdi:pencil"></ha-icon>
          </button>
        </div>
        <div id="form-container"></div>
        <table>
          <thead>
            <tr>
              <th>Prénom</th><th>Nom</th><th>Tél mobile</th><th>Email</th><th>Notifs</th><th></th>
            </tr>
          </thead>
          <tbody id="tbody">
            <tr><td colspan="6" class="empty">Chargement…</td></tr>
          </tbody>
        </table>
      </ha-card>
    `;
    this.shadowRoot.getElementById('btn-add').onclick = () => this._showForm(null);
    this.shadowRoot.getElementById('settings-edit').onclick = () => this._editSettings();
  }

  set hass(hass) {
    this._hass = hass;
    if (!this._loaded) { this._loaded = true; this._load(); }
  }

  async _load() {
    try {
      [this._recipients, this._settings] = await Promise.all([
        this._hass.callWS({ type: 'smart_locker/recipients/list' }),
        this._hass.callWS({ type: 'smart_locker/settings/get' }),
      ]);
    } catch (_) { this._recipients = []; this._settings = {}; }
    this._renderSettings();
    this._renderTable();
  }

  _renderSettings() {
    const el = this.shadowRoot.getElementById('settings-value');
    if (el) el.textContent = this._settings.notification_title || '—';
  }

  _editSettings() {
    const row = this.shadowRoot.getElementById('settings-row');
    const current = this._settings.notification_title || '';
    row.innerHTML = `
      <ha-icon icon="mdi:email-outline" style="--mdc-icon-size:16px;color:var(--secondary-text-color);flex-shrink:0;"></ha-icon>
      <span class="settings-label">Objet&nbsp;:</span>
      <input class="settings-input" id="settings-input" type="text" value="${this._esc(current)}">
      <button class="r-icon-btn" id="settings-save" title="Enregistrer"><ha-icon icon="mdi:check"></ha-icon></button>
      <button class="r-icon-btn" id="settings-cancel" title="Annuler"><ha-icon icon="mdi:close"></ha-icon></button>
    `;
    const input = this.shadowRoot.getElementById('settings-input');
    this.shadowRoot.getElementById('settings-cancel').onclick = () => {
      this._renderSettings();
      this._rebindSettingsEdit();
    };
    this.shadowRoot.getElementById('settings-save').onclick = () => this._saveSettings();
    input.focus(); input.select();
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') this._saveSettings();
      if (e.key === 'Escape') this.shadowRoot.getElementById('settings-cancel').click();
    });
  }

  async _saveSettings() {
    const input = this.shadowRoot.getElementById('settings-input');
    if (!input) return;
    const notification_title = input.value.trim();
    if (!notification_title) return;
    try {
      this._settings = await this._hass.callWS({
        type: 'smart_locker/settings/set', notification_title
      });
    } catch (err) { console.error('SmartLocker settings save:', err); }
    this._renderSettings();
    this._rebindSettingsEdit();
  }

  _rebindSettingsEdit() {
    const row = this.shadowRoot.getElementById('settings-row');
    if (!row) return;
    row.innerHTML = `
      <ha-icon icon="mdi:email-outline" style="--mdc-icon-size:16px;color:var(--secondary-text-color);flex-shrink:0;"></ha-icon>
      <span class="settings-label">Objet des notifs&nbsp;:</span>
      <span class="settings-value" id="settings-value">${this._esc(this._settings.notification_title || '—')}</span>
      <button class="r-icon-btn" id="settings-edit" title="Modifier l'objet">
        <ha-icon icon="mdi:pencil"></ha-icon>
      </button>
    `;
    this.shadowRoot.getElementById('settings-edit').onclick = () => this._editSettings();
  }

  _renderTable() {
    const tbody = this.shadowRoot.getElementById('tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    if (!this._recipients.length) {
      tbody.innerHTML = '<tr><td colspan="6" class="empty">Aucun destinataire — cliquez sur Ajouter.</td></tr>';
      return;
    }
    for (const r of this._recipients) {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${this._esc(r.first_name)}</td>
        <td>${this._esc(r.last_name)}</td>
        <td>${this._esc(r.mobile || '—')}</td>
        <td>${this._esc(r.email || '—')}</td>
        <td>
          <div class="svc-badges">
            ${(r.notify_services || []).length
              ? (r.notify_services || []).map(s => `<span class="svc-badge">${this._esc(s)}</span>`).join('')
              : '<span class="svc-badge-none">—</span>'}
          </div>
        </td>
        <td class="col-actions">
          <button class="r-icon-btn" data-id="${r.id}" data-action="edit" title="Modifier">
            <ha-icon icon="mdi:pencil"></ha-icon>
          </button>
          <button class="r-icon-btn del" data-id="${r.id}" data-action="delete" title="Supprimer">
            <ha-icon icon="mdi:delete-outline"></ha-icon>
          </button>
        </td>
      `;
      tbody.appendChild(tr);
    }
    tbody.querySelectorAll('[data-action="edit"]').forEach(btn =>
      btn.addEventListener('click', () => {
        const r = this._recipients.find(x => x.id === btn.dataset.id);
        if (r) this._showForm(r);
      })
    );
    tbody.querySelectorAll('[data-action="delete"]').forEach(btn =>
      btn.addEventListener('click', () => this._delete(btn.dataset.id))
    );
  }

  _showForm(recipient) {
    const isNew = !recipient;
    const v = isNew
      ? { first_name: '', last_name: '', mobile: '', email: '', notify_services: [] }
      : recipient;

    // Services disponibles depuis hass.services.notify, sans les méta-services HA
    const _SKIP = new Set(['persistent_notification', 'all', 'notify']);
    const available = Object.keys(this._hass.services.notify || {})
      .filter(s => !_SKIP.has(s))
      .sort();
    const selected = new Set(v.notify_services || []);

    const svcHtml = available.length
      ? available.map(s =>
          `<label class="svc-check ${selected.has(s) ? 'active' : ''}" data-svc="${this._esc(s)}">
            <input type="checkbox" value="${this._esc(s)}" ${selected.has(s) ? 'checked' : ''}>
            ${this._esc(s)}
          </label>`
        ).join('')
      : '<span style="font-size:0.8em;color:var(--secondary-text-color)">Aucun service notify disponible</span>';

    const container = this.shadowRoot.getElementById('form-container');
    container.innerHTML = `
      <div class="form">
        <div class="form-title">${isNew ? 'Nouveau destinataire' : 'Modifier le destinataire'}</div>
        <div class="form-grid">
          <div class="field">
            <label>Prénom *</label>
            <input id="f-first" type="text" value="${this._esc(v.first_name)}" placeholder="Jean">
          </div>
          <div class="field">
            <label>Nom *</label>
            <input id="f-last" type="text" value="${this._esc(v.last_name)}" placeholder="Dupont">
          </div>
          <div class="field">
            <label>Tél mobile</label>
            <input id="f-mobile" type="tel" value="${this._esc(v.mobile || '')}" placeholder="0612345678">
          </div>
          <div class="field">
            <label>Email</label>
            <input id="f-email" type="email" value="${this._esc(v.email || '')}" placeholder="jean.dupont@example.com">
          </div>
        </div>
        <div class="svc-label">Services de notification</div>
        <div class="svc-list" id="svc-list">${svcHtml}</div>
        <div class="form-actions">
          <button class="r-btn r-btn-secondary" id="f-cancel">Annuler</button>
          <button class="r-btn r-btn-primary" id="f-save">Enregistrer</button>
        </div>
      </div>
    `;
    const sr = this.shadowRoot;
    sr.getElementById('f-cancel').onclick = () => { container.innerHTML = ''; };
    sr.getElementById('f-save').onclick   = () => this._save(isNew ? null : recipient.id);

    // Toggle visuel des badges-services
    sr.getElementById('svc-list').addEventListener('click', e => {
      const label = e.target.closest('.svc-check');
      if (!label) return;
      const cb = label.querySelector('input[type=checkbox]');
      cb.checked = !cb.checked;
      label.classList.toggle('active', cb.checked);
    });

    sr.getElementById('f-first').focus();
  }

  async _save(id) {
    const sr = this.shadowRoot;
    const get = sel => sr.getElementById(sel).value.trim();
    const first_name = get('f-first'), last_name = get('f-last');
    const mobile = get('f-mobile'), email = get('f-email');
    const notify_services = [...sr.querySelectorAll('#svc-list input:checked')].map(cb => cb.value);

    let ok = true;
    for (const [sel, val] of [['f-first', first_name], ['f-last', last_name]]) {
      sr.getElementById(sel).classList.toggle('err', !val);
      if (!val) ok = false;
    }
    if (!ok) return;

    try {
      const type = id ? 'smart_locker/recipients/update' : 'smart_locker/recipients/add';
      await this._hass.callWS({
        type, ...(id ? { recipient_id: id } : {}),
        first_name, last_name, mobile, email, notify_services,
      });
      sr.getElementById('form-container').innerHTML = '';
      await this._load();
    } catch (err) { console.error('SmartLocker recipients save:', err); }
  }

  async _delete(id) {
    const r = this._recipients.find(x => x.id === id);
    if (!r || !confirm(`Supprimer ${r.first_name} ${r.last_name} ?`)) return;
    try {
      await this._hass.callWS({ type: 'smart_locker/recipients/delete', recipient_id: id });
      await this._load();
    } catch (err) { console.error('SmartLocker recipients delete:', err); }
  }

  _esc(s) {
    return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  getCardSize() { return 4; }
}

customElements.define('smart-locker-recipients-card', SmartLockerRecipientsCard);

window.customCards.push({
  type:        'smart-locker-recipients-card',
  name:        'Smart Locker — Destinataires',
  description: 'Gestion des destinataires et paramètres de notification',
  preview:     false,
});
