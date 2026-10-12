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
            ${[1,2,4,5,6,7,8].map(i =>
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
        `<option value="${r.id}">${r.last_name} ${r.first_name}</option>`
      ).join('');
    select.value = current;
  }

  _update() {
    const sr = this.shadowRoot;
    if (!this._hass || !sr.getElementById('state-icon')) return;

    const entity = this._hass.states[this._entityId];
    if (!entity) return;

    const state = entity.state;
    const users = entity.attributes.assigned_recipients || [];
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
    usersEl.innerHTML = '';
    if (users.length) {
      users.forEach(u => {
        const badge = document.createElement('div');
        badge.className = 'user-badge';

        const top = document.createElement('div');
        top.className = 'user-badge-top';
        const name = document.createElement('span');
        name.textContent = u.name;
        const removeBtn = document.createElement('button');
        removeBtn.className = 'user-badge-remove';
        removeBtn.textContent = '×';
        removeBtn.title = `Retirer ${u.name}`;
        removeBtn.onclick = () => this._svc('unassign', { recipient_id: u.id });
        top.appendChild(name);
        top.appendChild(removeBtn);
        badge.appendChild(top);

        const notifTime = u.notified_at;
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
    const recipient_id = select.value;
    if (!recipient_id) return;
    this._svc('assign', { recipient_id });
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

  /* Enrôlement badge */
  .enroll {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
    border-radius: 8px;
    padding: 10px 12px;
    margin-bottom: 14px;
    font-size: 0.85em;
    background: var(--secondary-background-color);
    border-left: 4px solid var(--primary-color);
  }
  .enroll.ok    { border-left-color: #4CAF50; }
  .enroll.warn  { border-left-color: #FF9800; }
  .enroll.err   { border-left-color: #F44336; }
  .enroll .msg  { flex: 1; min-width: 180px; }
  .enroll ha-icon { --mdc-icon-size: 20px; }
  .badge-id { font-family: monospace; font-size: 0.9em; }
  .badge-cell { display: flex; align-items: center; gap: 2px; white-space: nowrap; }

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

  .table-wrap { overflow-x: auto; }
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
        <div id="enroll-container"></div>
        <div id="form-container"></div>
        <div class="table-wrap"><table>
          <thead>
            <tr>
              <th>Prénom</th><th>Nom</th><th>Tél mobile</th><th>Email</th><th>Notifs</th><th>Badge</th><th></th>
            </tr>
          </thead>
          <tbody id="tbody">
            <tr><td colspan="7" class="empty">Chargement…</td></tr>
          </tbody>
        </table></div>
      </ha-card>
    `;
    this.shadowRoot.getElementById('btn-add').onclick = () => this._showForm(null);
  }

  set hass(hass) {
    this._hass = hass;
    if (!this._loaded) { this._loaded = true; this._load(); }
  }

  async _load() {
    try {
      this._recipients = await this._hass.callWS({ type: 'smart_locker/recipients/list' });
    } catch (_) { this._recipients = []; }
    this._renderTable();
  }

  _renderTable() {
    const tbody = this.shadowRoot.getElementById('tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    if (!this._recipients.length) {
      tbody.innerHTML = '<tr><td colspan="7" class="empty">Aucun destinataire — cliquez sur Ajouter.</td></tr>';
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
        <td>
          <div class="badge-cell">
            ${r.badge_id
              ? `<span class="badge-id">${this._esc(r.badge_id)}</span>
                 <button class="r-icon-btn del" data-id="${r.id}" data-action="unbadge" title="Retirer le badge">
                   <ha-icon icon="mdi:close"></ha-icon></button>`
              : '<span class="svc-badge-none">—</span>'}
          </div>
        </td>
        <td class="col-actions">
          <button class="r-icon-btn" data-id="${r.id}" data-action="enroll" title="Enrôler un badge (le passer devant le lecteur)">
            <ha-icon icon="mdi:card-account-details-outline"></ha-icon>
          </button>
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
    tbody.querySelectorAll('[data-action="enroll"]').forEach(btn =>
      btn.addEventListener('click', () => this._enroll(btn.dataset.id))
    );
    tbody.querySelectorAll('[data-action="unbadge"]').forEach(btn =>
      btn.addEventListener('click', () => this._unbadge(btn.dataset.id))
    );
  }

  // ── Badges ───────────────────────────────────────────────────────────────

  _name(id) {
    const r = this._recipients.find(x => x.id === id);
    return r ? `${r.first_name} ${r.last_name}` : '?';
  }

  async _enroll(id) {
    await this._stopEnroll();
    const name = this._name(id);
    try {
      this._enrollUnsub = await this._hass.connection.subscribeMessage(
        ev => this._onEnrollEvent(id, name, ev),
        { type: 'smart_locker/badges/enroll', recipient_id: id },
      );
    } catch (err) {
      this._banner('err', 'mdi:alert-circle-outline', `Enrôlement impossible : ${err.message || err}`, [['Fermer']]);
    }
  }

  async _stopEnroll() {
    clearInterval(this._countdown);
    if (this._enrollUnsub) {
      const unsub = this._enrollUnsub;
      this._enrollUnsub = null;
      try { await unsub(); } catch (_) { /* connexion fermée */ }
    }
  }

  _onEnrollEvent(id, name, ev) {
    switch (ev.status) {
      case 'waiting': {
        let left = ev.timeout;
        const text = () => `Passez le badge de <b>${this._esc(name)}</b> devant le lecteur… (${left} s)`;
        this._banner('', 'mdi:contactless-payment', text(), [['Annuler', () => this._stopEnroll()]]);
        this._countdown = setInterval(() => {
          left = Math.max(0, left - 1);
          const msg = this.shadowRoot.querySelector('.enroll .msg');
          if (msg) msg.innerHTML = text();
        }, 1000);
        break;
      }
      case 'enrolled':
        this._stopEnroll();
        this._banner('ok', 'mdi:check-circle-outline',
          `Badge <span class="badge-id">${this._esc(ev.badge_id)}</span> attribué à <b>${this._esc(name)}</b>.`, [['OK']]);
        this._load();
        break;
      case 'conflict':
        this._stopEnroll();
        this._banner('warn', 'mdi:alert-outline',
          `Le badge <span class="badge-id">${this._esc(ev.badge_id)}</span> est déjà attribué à <b>${this._esc(ev.owner)}</b>.
           Le retirer à ${this._esc(ev.owner)} et l'attribuer à <b>${this._esc(name)}</b> ?`,
          [['Annuler'], ['Réattribuer', () => this._assignBadge(id, ev.badge_id, true), true]]);
        break;
      case 'timeout':
        this._stopEnroll();
        this._banner('err', 'mdi:timer-off-outline', 'Aucun badge lu, enrôlement annulé.', [['Fermer']]);
        break;
      case 'cancelled':
        this._stopEnroll();
        break;
    }
  }

  async _assignBadge(id, badge_id, force = false) {
    try {
      this._recipients = await this._hass.callWS({
        type: 'smart_locker/badges/assign', recipient_id: id, badge_id, force,
      });
      this._renderTable();
      if (badge_id) {
        this._banner('ok', 'mdi:check-circle-outline',
          `Badge <span class="badge-id">${this._esc(badge_id)}</span> attribué à <b>${this._esc(this._name(id))}</b>.`, [['OK']]);
      }
    } catch (err) {
      this._banner('err', 'mdi:alert-circle-outline', this._esc(err.message || err), [['Fermer']]);
    }
  }

  _unbadge(id) {
    if (!confirm(`Retirer le badge de ${this._name(id)} ?`)) return;
    this._assignBadge(id, '');
  }

  // Bandeau : actions = [[libellé, callback?, primaire?]] ; tout bouton ferme le bandeau.
  _banner(kind, icon, html, actions) {
    const box = this.shadowRoot.getElementById('enroll-container');
    box.innerHTML = `
      <div class="enroll ${kind}">
        <ha-icon icon="${icon}"></ha-icon>
        <span class="msg">${html}</span>
        ${actions.map(([label, , primary], i) =>
          `<button class="r-btn ${primary ? 'r-btn-primary' : 'r-btn-secondary'}" data-i="${i}">${label}</button>`).join('')}
      </div>`;
    box.querySelectorAll('button').forEach(btn => btn.onclick = () => {
      box.innerHTML = '';
      const cb = actions[btn.dataset.i][1];
      if (cb) cb();
    });
  }

  disconnectedCallback() { this._stopEnroll(); }

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

// ─── Carte éclairage (contrôleur WLED) ───────────────────────────────────────

const LED_LEGEND = [
  ['#00FF00', 'Libre / récupéré',               false],
  ['#004BFF', 'Colis en attente',               false],
  ['#00FF00', 'Code correct : casier à ouvrir', true],
  ['#FF0000', 'Code incorrect (3 s)',           true],
  ['#FF6E00', 'Porte ouverte trop longtemps',   true],
  ['#FF0000', 'Hors service',                   false],
];

const LCSS = RCSS + `
  .field { min-width: 0; }
  .field input, .field select { width: 100%; box-sizing: border-box; }
  .field select {
    padding: 6px 8px;
    border: 1px solid var(--divider-color);
    border-radius: 6px;
    background: var(--card-background-color);
    color: var(--primary-text-color);
    font-size: 0.85em;
  }
  .field .hint { font-size: 0.7em; color: var(--secondary-text-color); }
  .status { font-size: 0.78em; color: var(--secondary-text-color); margin-right: auto; align-self: center; }
  .legend { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 12px; font-size: 0.78em; margin-top: 12px; }
  .legend span { display: flex; align-items: center; gap: 6px; }
  .dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
  .dot.blink { animation: sl-blink 1s steps(1) infinite; }
  @keyframes sl-blink { 50% { opacity: 0.15; } }
`;

class SmartLockerLedsCard extends HTMLElement {
  static getStubConfig() { return {}; }
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._loaded = false;
  }

  setConfig(config) { this._config = config || {}; }

  set hass(hass) {
    this._hass = hass;
    if (!this._loaded) { this._loaded = true; this._load(); }
  }

  async _load() {
    let devices = [], settings = {};
    try {
      [devices, settings] = await Promise.all([
        this._hass.callWS({ type: 'smart_locker/leds/devices' }),
        this._hass.callWS({ type: 'smart_locker/settings/get' }),
      ]);
    } catch (err) { console.error('SmartLocker leds load:', err); }
    this._render(devices, settings);
  }

  _render(devices, s) {
    const known = devices.some(d => d.entry_id === s.led_entry_id);
    const options = [
      `<option value="" ${!s.led_entry_id ? 'selected' : ''}>— Aucun (LED désactivées) —</option>`,
      ...devices.map(d =>
        `<option value="${this._esc(d.entry_id)}" ${d.entry_id === s.led_entry_id ? 'selected' : ''}>
          ${this._esc(d.title)}${d.host ? ` (${this._esc(d.host)})` : ''}</option>`),
      ...(s.led_entry_id && !known
        ? [`<option value="${this._esc(s.led_entry_id)}" selected>⚠ Appareil introuvable</option>`] : []),
    ].join('');
    const num = (id, label, value, min, max, hint) => `
      <div class="field">
        <label>${label}</label>
        <input id="${id}" type="number" min="${min}" max="${max}" value="${this._esc(value)}">
        <span class="hint">${hint}</span>
      </div>`;

    this.shadowRoot.innerHTML = `
      <style>${LCSS}</style>
      <ha-card>
        <div class="card-header">
          <div class="card-title"><ha-icon icon="mdi:led-strip-variant"></ha-icon>Éclairage des casiers</div>
          <button class="btn-add" id="btn-test" title="Allume l'éclairage comme si quelqu'un tapait sur le digicode">
            <ha-icon icon="mdi:lightbulb-on-outline"></ha-icon>Tester
          </button>
        </div>
        <div class="form">
          <div class="form-grid">
            <div class="field" style="grid-column: 1 / -1">
              <label>Contrôleur WLED</label>
              <select id="f-entry">${options}</select>
              <span class="hint">${devices.length ? 'Appareils de l\'intégration WLED de Home Assistant'
                : 'Aucun appareil WLED : ajouter l\'intégration WLED dans Paramètres › Appareils et services'}</span>
            </div>
            ${num('f-bri', 'Luminosité', s.led_brightness, 1, 255, '1 à 255')}
            ${num('f-timeout', 'Durée d\'allumage (s)', s.led_timeout, 5, 3600, 'Après la dernière touche / porte')}
            ${num('f-door', 'Alerte porte ouverte (s)', s.door_alert_delay, 5, 3600, 'Clignotement orange au-delà')}
          </div>
          <div class="form-actions">
            <span class="status" id="status"></span>
            <button class="r-btn r-btn-primary" id="f-save">Enregistrer</button>
          </div>
        </div>
        <div class="legend">
          ${LED_LEGEND.map(([c, l, b]) =>
            `<span><i class="dot ${b ? 'blink' : ''}" style="background:${c}"></i>${l}</span>`).join('')}
        </div>
      </ha-card>
    `;
    const sr = this.shadowRoot;
    sr.getElementById('f-save').onclick = () => this._save();
    sr.getElementById('btn-test').onclick = async () => {
      try {
        await this._hass.callWS({ type: 'smart_locker/leds/test' });
        this._status('Éclairage allumé');
      } catch (err) { this._status(`Erreur : ${err.message || err}`); }
    };
  }

  async _save() {
    const sr = this.shadowRoot;
    const int = id => parseInt(sr.getElementById(id).value, 10);
    try {
      await this._hass.callWS({
        type: 'smart_locker/settings/set',
        led_entry_id:     sr.getElementById('f-entry').value,
        led_brightness:   int('f-bri'),
        led_timeout:      int('f-timeout'),
        door_alert_delay: int('f-door'),
      });
      this._status('Enregistré ✓');
    } catch (err) { this._status(`Erreur : ${err.message || err}`); }
  }

  _status(text) {
    const el = this.shadowRoot.getElementById('status');
    if (el) el.textContent = text;
  }

  _esc(s) {
    return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  getCardSize() { return 4; }
}

customElements.define('smart-locker-leds-card', SmartLockerLedsCard);

window.customCards.push({
  type:        'smart-locker-leds-card',
  name:        'Smart Locker — Éclairage',
  description: 'Choix du contrôleur WLED et réglages de l\'éclairage des casiers',
  preview:     false,
});

// ─── Carte messages (templates des notifications) ───────────────────────────

const MCSS = RCSS + `
  .field { min-width: 0; margin-bottom: 10px; }
  .field input, .field textarea { width: 100%; box-sizing: border-box; }
  .field textarea {
    padding: 6px 8px;
    border: 1px solid var(--divider-color);
    border-radius: 6px;
    background: var(--card-background-color);
    color: var(--primary-text-color);
    font-size: 0.82em;
    resize: vertical;
    font-family: inherit;
  }
  .field textarea.code { font-family: monospace; font-size: 0.75em; min-height: 160px; }
  .field .hint { font-size: 0.7em; color: var(--secondary-text-color); }
  .vars { display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 10px; }
  .var {
    font-family: monospace; font-size: 0.72em; padding: 2px 7px; border-radius: 10px;
    border: 1px solid var(--divider-color); background: var(--card-background-color);
    color: var(--primary-text-color); cursor: pointer;
  }
  .var:hover { border-color: var(--primary-color); }
  .status { font-size: 0.78em; color: var(--secondary-text-color); margin-right: auto; align-self: center; }
  .status.err { color: #F44336; }
  .preview { margin-top: 12px; display: flex; flex-direction: column; gap: 8px; }
  .preview h4 { margin: 0; font-size: 0.75em; color: var(--secondary-text-color); font-weight: 600; }
  .preview .box {
    background: var(--secondary-background-color); border-radius: 8px; padding: 8px 10px;
    font-size: 0.82em; white-space: pre-wrap; word-break: break-word;
  }
  .preview iframe { width: 100%; height: 360px; border: 1px solid var(--divider-color); border-radius: 8px; background: #fff; }
`;

const MSG_FIELDS = [
  ['notification_title', 'Titre (objet de l\'email, titre de la notification push)', 'input'],
  ['msg_text',           'Texte (SMS, notification push, version texte de l\'email)', 'textarea'],
  ['msg_email_html',     'Email HTML (corps)', 'code'],
];

class SmartLockerMessagesCard extends HTMLElement {
  static getStubConfig() { return {}; }
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._loaded = false;
  }

  setConfig(config) { this._config = config || {}; }

  set hass(hass) {
    this._hass = hass;
    if (!this._loaded) { this._loaded = true; this._load(); }
  }

  async _load() {
    let settings = {}, info = { variables: {}, defaults: {} };
    try {
      [settings, info] = await Promise.all([
        this._hass.callWS({ type: 'smart_locker/settings/get' }),
        this._hass.callWS({ type: 'smart_locker/messages/preview' }),
      ]);
    } catch (err) { console.error('SmartLocker messages load:', err); }
    this._defaults = info.defaults || {};
    this._render(settings, info.variables || {});
  }

  _render(settings, variables) {
    const field = ([key, label, kind]) => {
      const v = this._esc(settings[key] || '');
      const input = kind === 'input'
        ? `<input id="f-${key}" type="text" value="${v}">`
        : `<textarea id="f-${key}" class="${kind === 'code' ? 'code' : ''}" rows="4">${v}</textarea>`;
      return `<div class="field"><label>${label}</label>${input}</div>`;
    };
    this.shadowRoot.innerHTML = `
      <style>${MCSS}</style>
      <ha-card>
        <div class="card-header">
          <div class="card-title"><ha-icon icon="mdi:message-text-outline"></ha-icon>Messages aux destinataires</div>
        </div>
        <div class="form">
          <div class="svc-label">Variables (clic = insérer dans le champ actif) — templates Jinja Home Assistant</div>
          <div class="vars">
            ${Object.entries(variables).map(([k, d]) =>
              `<button class="var" data-var="${this._esc(k)}" title="${this._esc(d)}">{{ ${this._esc(k)} }}</button>`).join('')}
          </div>
          ${MSG_FIELDS.map(field).join('')}
          <div class="field"><span class="hint">
            Exemple de condition : <code>{% if has_badge %}ou présentez votre badge{% endif %}</code>
          </span></div>
          <div class="form-actions">
            <span class="status" id="status"></span>
            <button class="r-btn r-btn-secondary" id="b-defaults">Valeurs par défaut</button>
            <button class="r-btn r-btn-secondary" id="b-preview">Aperçu</button>
            <button class="r-btn r-btn-primary" id="b-save">Enregistrer</button>
          </div>
        </div>
        <div class="preview" id="preview"></div>
      </ha-card>
    `;
    const sr = this.shadowRoot;
    this._active = sr.getElementById('f-msg_text');
    MSG_FIELDS.forEach(([key]) => sr.getElementById(`f-${key}`).addEventListener('focus', e => { this._active = e.target; }));
    sr.querySelectorAll('.var').forEach(btn => btn.onclick = () => this._insert(`{{ ${btn.dataset.var} }}`));
    sr.getElementById('b-preview').onclick = () => this._preview();
    sr.getElementById('b-save').onclick = () => this._save();
    sr.getElementById('b-defaults').onclick = () => {
      if (!confirm('Remplacer les trois templates par les valeurs par défaut (non enregistré tant que vous ne cliquez pas sur Enregistrer) ?')) return;
      MSG_FIELDS.forEach(([key]) => { sr.getElementById(`f-${key}`).value = this._defaults[key] || ''; });
      this._preview();
    };
  }

  _insert(text) {
    const el = this._active;
    if (!el) return;
    const start = el.selectionStart ?? el.value.length, end = el.selectionEnd ?? el.value.length;
    el.value = el.value.slice(0, start) + text + el.value.slice(end);
    el.focus();
    el.selectionStart = el.selectionEnd = start + text.length;
  }

  _values() {
    return Object.fromEntries(MSG_FIELDS.map(([key]) => [key, this.shadowRoot.getElementById(`f-${key}`).value]));
  }

  async _preview() {
    const box = this.shadowRoot.getElementById('preview');
    try {
      const res = await this._hass.callWS({ type: 'smart_locker/messages/preview', ...this._values() });
      const r = res.rendered, sms = r.msg_text.length;
      box.innerHTML = `
        <h4>Titre</h4><div class="box" id="p-title"></div>
        <h4>Texte — ${sms} caractères (${Math.ceil(sms / 153) || 1} SMS environ ; accents et emoji réduisent la taille d'un SMS)</h4>
        <div class="box" id="p-text"></div>
        <h4>Email</h4><iframe sandbox="" id="p-html"></iframe>
        <span class="hint" style="font-size:0.7em;color:var(--secondary-text-color)">
          Exemple pour ${this._esc(res.sample.full_name)}, casier ${res.sample.locker}, PIN ${res.sample.pin_formatted}, avec badge.</span>`;
      box.querySelector('#p-title').textContent = r.notification_title;
      box.querySelector('#p-text').textContent = r.msg_text;
      box.querySelector('#p-html').srcdoc = r.msg_email_html;
      this._status('');
    } catch (err) {
      box.innerHTML = '';
      this._status(`Template invalide : ${err.message || err}`, true);
    }
  }

  async _save() {
    try {
      await this._hass.callWS({ type: 'smart_locker/settings/set', ...this._values() });
      this._status('Enregistré ✓');
    } catch (err) { this._status(`Erreur : ${err.message || err}`, true); }
  }

  _status(text, error = false) {
    const el = this.shadowRoot.getElementById('status');
    if (!el) return;
    el.textContent = text;
    el.classList.toggle('err', error);
  }

  _esc(s) {
    return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  getCardSize() { return 6; }
}

customElements.define('smart-locker-messages-card', SmartLockerMessagesCard);

window.customCards.push({
  type:        'smart-locker-messages-card',
  name:        'Smart Locker — Messages',
  description: 'Templates du titre, du SMS et de l\'email envoyés aux destinataires',
  preview:     false,
});
