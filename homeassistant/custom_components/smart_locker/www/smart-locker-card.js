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
    flex-wrap: wrap;
    gap: 6px;
    margin-bottom: 10px;
  }
  .btn {
    flex: 1 1 auto;
    min-width: 0;
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
  .btn.icon-only { flex: 0 0 auto; padding: 5px 8px; }
  .btn.hs-on { background: #F4433622; color: #F44336; }
  .btn:disabled, select:disabled, .icon-btn:disabled { opacity: 0.4; pointer-events: none; }

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
          <button class="btn icon-only" id="btn-hs" title="Mettre hors service">
            <ha-icon icon="mdi:wrench"></ha-icon>
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
    sr.getElementById('btn-hs').onclick     = () => this._toggleOutOfService();
  }

  _toggleOutOfService() {
    const entity = this._hass && this._hass.states[this._entityId];
    if (!entity) return;
    const hs = entity.state === 'hors_service';
    if (!hs && !confirm(`Mettre le casier ${this._lockerId} hors service ?\n`
      + 'Le PIN et le badge n\'ouvriront plus ce casier, il ne pourra plus être assigné.')) return;
    this._svc('set_out_of_service', { out_of_service: !hs });
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

    // Hors service : bouton bascule, notification et assignation désactivées
    const hs = state === 'hors_service';
    const hsBtn = sr.getElementById('btn-hs');
    hsBtn.classList.toggle('hs-on', hs);
    hsBtn.title = hs ? 'Remettre en service' : 'Mettre hors service';
    hsBtn.querySelector('ha-icon').setAttribute('icon', hs ? 'mdi:wrench-check' : 'mdi:wrench');
    for (const id of ['btn-notify', 'user-select', 'btn-assign']) sr.getElementById(id).disabled = hs;
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
    const doorEntity = this._hass.states[entity.attributes.door_entity || this._doorEntityId];
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

  /* Liste des destinataires */
  .plist { display: flex; flex-direction: column; }
  .plist .empty { text-align: center; color: var(--secondary-text-color); padding: 20px 8px; font-size: 0.85em; }
  .person {
    display: flex; align-items: flex-start; gap: 8px;
    padding: 10px 4px; border-bottom: 1px solid var(--divider-color);
  }
  .person:last-child { border-bottom: none; }
  .p-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; }
  .p-name { font-weight: 600; font-size: 0.95em; }
  .p-contact { display: flex; flex-wrap: wrap; gap: 0 12px; font-size: 0.8em; color: var(--secondary-text-color); }
  .p-contact span { overflow-wrap: anywhere; }
  .p-tags { display: flex; flex-wrap: wrap; align-items: center; gap: 4px; margin-top: 2px; }
  .p-warn { font-size: 0.75em; color: #E65100; }
  .p-badge {
    display: inline-flex; align-items: center; gap: 3px; font-size: 0.72em; font-family: monospace;
    padding: 1px 2px 1px 6px; border-radius: 8px; border: 1px solid var(--divider-color);
    color: var(--primary-text-color);
  }
  .p-badge ha-icon { --mdc-icon-size: 13px; color: var(--secondary-text-color); }
  .p-badge button { all: unset; cursor: pointer; display: flex; padding: 1px; border-radius: 50%; }
  .p-badge button:hover ha-icon { color: #F44336; }
  .p-actions { display: flex; flex-shrink: 0; gap: 2px; }
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
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 8px;
    margin-bottom: 10px;
  }
  .form-grid .field { min-width: 0; }
  .form-grid .field input { width: 100%; box-sizing: border-box; }
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
        <div class="plist" id="tbody"><div class="empty">Chargement…</div></div>
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
      tbody.innerHTML = '<div class="empty">Aucun destinataire — cliquez sur Ajouter.</div>';
      return;
    }
    // Une fiche par destinataire : lisible à toutes les largeurs (pas de tableau)
    const sorted = [...this._recipients].sort((a, b) =>
      `${a.last_name} ${a.first_name}`.localeCompare(`${b.last_name} ${b.first_name}`));
    for (const r of sorted) {
      const row = document.createElement('div');
      row.className = 'person';
      const contact = [r.mobile, r.email].filter(Boolean).map(v => `<span>${this._esc(v)}</span>`).join('');
      const services = r.notify_services || [];
      row.innerHTML = `
        <div class="p-main">
          <div class="p-name">${this._esc(r.first_name)} ${this._esc(r.last_name)}</div>
          <div class="p-contact">${contact || '<span class="svc-badge-none">Aucun contact</span>'}</div>
          <div class="p-tags">
            ${services.length
              ? services.map(s => `<span class="svc-badge">${this._esc(s)}</span>`).join('')
              : '<span class="p-warn">Aucune notification</span>'}
            ${r.badge_id
              ? `<span class="p-badge" title="Badge ${this._esc(r.badge_id)}">
                   <ha-icon icon="mdi:card-account-details"></ha-icon>${this._esc(r.badge_id)}
                   <button data-id="${r.id}" data-action="unbadge" title="Retirer le badge" aria-label="Retirer le badge">
                     <ha-icon icon="mdi:close"></ha-icon></button>
                 </span>`
              : ''}
          </div>
        </div>
        <div class="p-actions">
          <button class="r-icon-btn" data-id="${r.id}" data-action="enroll"
                  title="${r.badge_id ? 'Changer de badge' : 'Enrôler un badge'} (le passer devant le lecteur)">
            <ha-icon icon="mdi:card-account-details-outline"></ha-icon>
          </button>
          <button class="r-icon-btn" data-id="${r.id}" data-action="edit" title="Modifier">
            <ha-icon icon="mdi:pencil"></ha-icon>
          </button>
          <button class="r-icon-btn del" data-id="${r.id}" data-action="delete" title="Supprimer">
            <ha-icon icon="mdi:delete-outline"></ha-icon>
          </button>
        </div>
      `;
      tbody.appendChild(row);
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

// Ancienne carte Éclairage : ses réglages sont dans la carte Matériel (v0.8.0). Conservée pour
// que les tableaux de bord existants n'affichent pas d'erreur de configuration.
class SmartLockerLedsCard extends HTMLElement {
  static getStubConfig() { return {}; }
  constructor() { super(); this.attachShadow({ mode: 'open' }); }
  setConfig(config) {
    this._config = config || {};
    this.shadowRoot.innerHTML = `
      <style>${RCSS}</style>
      <ha-card>
        <div class="card-header"><div class="card-title">
          <ha-icon icon="mdi:led-strip-variant"></ha-icon>Éclairage des casiers</div></div>
        <p style="margin:0;font-size:0.88em">Les réglages et les tests de l'éclairage sont maintenant dans la
          carte <b>Matériel</b> (<code>custom:smart-locker-hardware-card</code>). Cette carte peut être retirée
          du tableau de bord.</p>
      </ha-card>`;
  }
  set hass(_hass) {}
  getCardSize() { return 2; }
}

customElements.define('smart-locker-leds-card', SmartLockerLedsCard);

window.customCards.push({
  type:        'smart-locker-leds-card',
  name:        'Smart Locker — Éclairage (obsolète)',
  description: 'Remplacée par la carte Matériel',
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

// ─── Carte vue d'ensemble de tous les casiers ───────────────────────────────
// Grille calquée sur le meuble (Kallax 4x2 debout) : impairs à gauche, pairs à droite,
// la case technique garde sa place. Un tap sur un casier ouvre son détail sous la
// grille, avec les seules actions utiles à son état.
// Couleurs alignées sur les LED du meuble (bleu = colis, orange = porte ouverte).

const OVERVIEW_STATES = {
  libre:        { color: '#43A047', label: 'Libre' },
  'occupé':     { color: '#1E88E5', label: 'À notifier' },
  en_attente:   { color: '#1E88E5', label: 'Colis en attente' },
  'récupéré':   { color: '#00ACC1', label: 'Récupéré' },
  hors_service: { color: '#E53935', label: 'Hors service' },
};
const DOOR_OPEN_COLOR = '#FB8C00';

const OCSS = `
  :host { display: block; }
  ha-card { padding: 12px; }
  .head { display: flex; align-items: center; justify-content: space-between; margin: 2px 4px 10px; }
  .head h2 { font-size: 1.05em; font-weight: 600; margin: 0; }
  .summary { font-size: 0.78em; color: var(--secondary-text-color); }

  .grid { display: grid; grid-template-columns: repeat(var(--cols, 2), minmax(0, 1fr)); gap: 8px;
          max-width: 560px; margin: 0 auto; }
  .tile.tech {
    cursor: default; border: 1px dashed var(--divider-color); border-left: 5px solid var(--divider-color);
    background: var(--secondary-background-color); justify-content: center;
  }
  .tile.tech .num { color: var(--secondary-text-color); }
  .tile.tech .state { color: var(--secondary-text-color); font-weight: 500; }
  .detail { max-width: 560px; margin-left: auto; margin-right: auto; box-sizing: border-box; }
  .tile {
    all: unset; box-sizing: border-box; cursor: pointer; min-width: 0;
    display: flex; flex-direction: column; gap: 3px;
    padding: 8px 10px 9px; border-radius: 10px;
    background: color-mix(in srgb, var(--c) 10%, var(--card-background-color));
    border: 1px solid color-mix(in srgb, var(--c) 35%, transparent);
    border-left: 5px solid var(--c);
    transition: transform 0.1s, box-shadow 0.15s;
  }
  .tile:hover { box-shadow: 0 1px 6px rgba(0,0,0,0.12); }
  .tile:focus-visible { outline: 2px solid var(--primary-color); outline-offset: 2px; }
  .tile.sel { box-shadow: 0 0 0 2px var(--c); }
  .tile .top { display: flex; align-items: center; justify-content: space-between; gap: 4px; }
  .tile .num { font-size: 1.5em; font-weight: 700; line-height: 1; color: var(--primary-text-color); }
  .tile .state { font-size: 0.8em; font-weight: 600; color: var(--c); }
  .tile .who {
    font-size: 0.78em; color: var(--primary-text-color); white-space: nowrap;
    overflow: hidden; text-overflow: ellipsis; min-height: 1.2em;
  }
  .tile .who.empty { color: var(--secondary-text-color); }
  .door { display: inline-flex; align-items: center; gap: 2px; font-size: 0.7em; font-weight: 600;
          color: var(--secondary-text-color); }
  .door.open { color: ${DOOR_OPEN_COLOR}; }
  .door ha-icon { --mdc-icon-size: 16px; color: inherit; }
  .bell { --mdc-icon-size: 13px; color: var(--secondary-text-color); vertical-align: -2px; }

  .detail {
    margin-top: 10px; padding: 12px; border-radius: 10px;
    border: 1px solid var(--divider-color); border-top: 4px solid var(--c);
  }
  .d-head { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
  .d-head .t { font-weight: 700; font-size: 1.05em; flex: 1; min-width: 0; }
  .d-head .t span { font-weight: 600; font-size: 0.85em; color: var(--c); margin-left: 6px; }
  .x { all: unset; cursor: pointer; padding: 2px; color: var(--secondary-text-color); }
  .x ha-icon { --mdc-icon-size: 20px; }

  .pin { display: flex; align-items: baseline; gap: 8px; margin: 2px 0 10px; }
  .pin .lbl { font-size: 0.75em; color: var(--secondary-text-color); }
  .pin .v { font-family: monospace; font-size: 1.6em; font-weight: 700; letter-spacing: 3px; }
  .info { font-size: 0.82em; color: var(--secondary-text-color); margin: 0 0 10px; }

  .people { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 10px; }
  .chip {
    display: inline-flex; align-items: center; gap: 4px; max-width: 100%;
    padding: 4px 4px 4px 10px; border-radius: 14px; font-size: 0.85em;
    background: var(--secondary-background-color);
  }
  .chip .n { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .chip .when { font-size: 0.85em; color: var(--secondary-text-color); white-space: nowrap; }
  .chip button { all: unset; cursor: pointer; display: flex; padding: 2px; border-radius: 50%;
                 color: var(--secondary-text-color); }
  .chip button ha-icon { --mdc-icon-size: 16px; }

  .assign { display: flex; gap: 6px; margin-bottom: 10px; }
  .assign select {
    flex: 1; min-width: 0; padding: 8px; border-radius: 8px; font-size: 0.9em;
    border: 1px solid var(--divider-color); background: var(--card-background-color);
    color: var(--primary-text-color);
  }
  .b {
    all: unset; box-sizing: border-box; cursor: pointer; display: inline-flex; align-items: center;
    justify-content: center; gap: 6px; padding: 8px 14px; border-radius: 8px; font-size: 0.9em;
    font-weight: 600; white-space: nowrap;
  }
  .b ha-icon { --mdc-icon-size: 18px; color: inherit; }
  .b.primary { background: var(--primary-color); color: #fff; }
  .b.primary.wide { width: 100%; margin-bottom: 10px; }
  .b:disabled { opacity: 0.4; pointer-events: none; }
  .more { display: flex; flex-wrap: wrap; gap: 4px 2px; border-top: 1px solid var(--divider-color);
          padding-top: 6px; }
  .b.link { padding: 6px 8px; font-weight: 500; font-size: 0.82em; color: var(--secondary-text-color); }
  .b.link:hover { color: var(--primary-text-color); background: var(--secondary-background-color); }
  .b.link.danger:hover { color: #E53935; }
  .err { color: #E53935; font-size: 0.8em; margin-top: 6px; }
`;

class SmartLockerLockersCard extends HTMLElement {
  static getStubConfig() { return {}; }
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._selected = null;
    this._recipients = [];
    this._sig = '';
  }

  setConfig(config) {
    this._config = config || {};
    // Cases du meuble dans l'ordre de lecture (rangée par rangée), et cases techniques
    this._cases = this._config.cases || 8;
    this._columns = this._config.columns || 2;
    this._technical = (this._config.technical || [3]).map(Number);
    this._ids = [...Array(this._cases).keys()].map(i => i + 1).filter(i => !this._technical.includes(i));
    this._title = this._config.title ?? 'Casiers';
    this._sig = '';
    if (this._hass) this._render();
  }

  set hass(hass) {
    this._hass = hass;
    if (!this._recipientsLoaded) { this._recipientsLoaded = true; this._loadRecipients(); }
    // Ne redessiner que si un casier ou une porte a changé (préserve la saisie en cours)
    const sig = this._ids.map(i => {
      const l = hass.states[`smart_locker.casier_${i}`], d = hass.states[this._door(i)];
      return `${l && l.last_updated}|${d && d.state}`;
    }).join(';');
    if (sig !== this._sig) { this._sig = sig; this._render(); }
  }

  async _loadRecipients() {
    try {
      const list = await this._hass.callWS({ type: 'smart_locker/recipients/list' });
      this._recipients = list.sort((a, b) =>
        `${a.last_name} ${a.first_name}`.localeCompare(`${b.last_name} ${b.first_name}`));
    } catch (_) { this._recipients = []; }
    this._render();
  }

  // Capteur de porte résolu par le composant (carte Matériel), ancien nom fixe à défaut
  _door(i) {
    const e = this._hass && this._hass.states[`smart_locker.casier_${i}`];
    return (e && e.attributes.door_entity) || `binary_sensor.smart_locker_relais_porte_casier_${i}`;
  }

  _locker(i) {
    const e = this._hass.states[`smart_locker.casier_${i}`];
    if (!e) return null;
    const cfg = OVERVIEW_STATES[e.state] || { color: '#9E9E9E', label: e.state };
    const door = this._hass.states[this._door(i)];
    return {
      id: i, state: e.state, cfg, attrs: e.attributes,
      people: e.attributes.assigned_recipients || [],
      doorOpen: door ? door.state === 'on' : null,
    };
  }

  _render() {
    if (!this._hass) return;
    const lockers = this._ids.map(i => this._locker(i)).filter(Boolean);
    const busy = lockers.filter(l => ['occupé', 'en_attente'].includes(l.state)).length;
    const free = lockers.filter(l => l.state === 'libre').length;
    const toNotify = lockers.filter(l => l.state === 'occupé').length;
    const down = lockers.filter(l => l.state === 'hors_service').length;
    const sel = lockers.find(l => l.id === this._selected);

    // Conserver la sélection du menu déroulant pendant un redessin
    const prevSelect = this.shadowRoot.getElementById('who');
    const prevValue = prevSelect ? prevSelect.value : '';

    this.shadowRoot.innerHTML = `
      <style>${OCSS}</style>
      <ha-card>
        <div class="head">
          <h2>${this._esc(this._title)}</h2>
          <span class="summary">${busy} colis · ${free} libre${free > 1 ? 's' : ''}${toNotify ? ` · ${toNotify} à notifier` : ''}${down ? ` · ${down} HS` : ''}</span>
        </div>
        <div class="grid" style="--cols:${this._columns}">${[...Array(this._cases).keys()].map(i => i + 1).map(i =>
          this._technical.includes(i)
            ? `<div class="tile tech" aria-label="Case ${i}, compartiment technique"><div class="top"><span class="num">${i}</span></div><div class="state">Technique</div></div>`
            : (lockers.find(l => l.id === i) ? this._tile(lockers.find(l => l.id === i))
              : `<div class="tile tech"><div class="top"><span class="num">${i}</span></div><div class="state">Indisponible</div></div>`)).join('')}</div>
        ${sel ? this._detail(sel) : ''}
      </ha-card>`;

    const sr = this.shadowRoot;
    sr.querySelectorAll('.tile[data-id]').forEach(t => t.onclick = () => {
      const id = Number(t.dataset.id);
      this._selected = this._selected === id ? null : id;
      this._error = '';
      this._render();
      if (this._selected) sr.querySelector('.detail')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
    if (sel) this._bindDetail(sel, prevValue);
  }

  _tile(l) {
    const who = l.people.length
      ? `${this._esc(l.people[0].name)}${l.people.length > 1 ? ` +${l.people.length - 1}` : ''}`
        + (l.people.some(p => p.notified_at) ? ' <ha-icon class="bell" icon="mdi:bell-check"></ha-icon>' : '')
      : (l.state === 'libre' ? 'Disponible' : '—');
    const door = l.doorOpen === null ? ''
      : `<span class="door ${l.doorOpen ? 'open' : ''}" title="Porte ${l.doorOpen ? 'ouverte' : 'fermée'}">
           <ha-icon icon="${l.doorOpen ? 'mdi:door-open' : 'mdi:door-closed'}"></ha-icon>${l.doorOpen ? 'Ouverte' : ''}</span>`;
    return `
      <button class="tile ${this._selected === l.id ? 'sel' : ''}" data-id="${l.id}" style="--c:${l.cfg.color}"
              aria-label="Casier ${l.id}, ${this._esc(l.cfg.label)}">
        <div class="top"><span class="num">${l.id}</span>${door}</div>
        <div class="state">${this._esc(l.cfg.label)}</div>
        <div class="who ${l.people.length ? '' : 'empty'}">${who}</div>
      </button>`;
  }

  _detail(l) {
    const pin = l.attrs.pin_code;
    const hs = l.state === 'hors_service';
    const canAssign = !hs && l.state !== 'récupéré';
    const assignedIds = new Set(l.people.map(p => p.id));
    const options = this._recipients.filter(r => !assignedIds.has(r.id));
    const pending = l.people.filter(p => !p.notified_at).length;

    let primary = '';
    if (hs) primary = `<button class="b primary wide" data-act="unhs"><ha-icon icon="mdi:wrench-check"></ha-icon>Remettre en service</button>`;
    else if (l.people.length && pending) primary = `<button class="b primary wide" data-act="notify"><ha-icon icon="mdi:send"></ha-icon>Notifier ${pending > 1 ? `(${pending})` : ''}</button>`;

    const info = {
      'récupéré': `Colis récupéré${l.attrs.retrieved_at ? ` le ${this._esc(l.attrs.retrieved_at)}` : ''}. Le casier se libère à la fermeture de la porte.`,
      hors_service: 'Le code et le badge n\'ouvrent pas ce casier. Le contenu est conservé.',
      libre: 'Déposez le colis, puis choisissez son destinataire.',
    }[l.state];

    return `
      <div class="detail" style="--c:${l.cfg.color}">
        <div class="d-head">
          <div class="t">Casier ${l.id}<span>${this._esc(l.cfg.label)}</span></div>
          <button class="x" data-act="close" aria-label="Fermer"><ha-icon icon="mdi:close"></ha-icon></button>
        </div>
        ${pin && !hs && l.state !== 'récupéré' ? `<div class="pin"><span class="lbl">Code</span><span class="v">${pin.slice(0, 3)} ${pin.slice(3)}</span></div>` : ''}
        ${info ? `<p class="info">${info}</p>` : ''}
        ${l.people.length ? `<div class="people">${l.people.map(p => `
          <span class="chip"><span class="n">${this._esc(p.name)}</span>
            ${p.notified_at ? `<span class="when"><ha-icon class="bell" icon="mdi:bell-check"></ha-icon>${this._esc(p.notified_at)}</span>` : ''}
            <button data-unassign="${this._esc(p.id)}" aria-label="Retirer ${this._esc(p.name)}"><ha-icon icon="mdi:close-circle"></ha-icon></button>
          </span>`).join('')}</div>` : ''}
        ${primary}
        ${canAssign ? `
          <div class="assign">
            <select id="who" aria-label="Destinataire">
              <option value="">${l.people.length ? 'Ajouter un destinataire…' : 'Choisir le destinataire…'}</option>
              ${options.map(r => `<option value="${this._esc(r.id)}">${this._esc(r.first_name)} ${this._esc(r.last_name)}</option>`).join('')}
            </select>
            <button class="b ${l.people.length ? 'link' : 'primary'}" data-act="assign" disabled><ha-icon icon="mdi:account-plus"></ha-icon>Assigner</button>
          </div>` : ''}
        <div class="more">
          <button class="b link" data-act="open"><ha-icon icon="mdi:lock-open-variant"></ha-icon>Ouvrir</button>
          ${l.state !== 'libre' ? `<button class="b link danger" data-act="reset"><ha-icon icon="mdi:lock-reset"></ha-icon>Libérer</button>` : ''}
          ${hs ? '' : `<button class="b link danger" data-act="hs"><ha-icon icon="mdi:wrench"></ha-icon>Hors service</button>`}
        </div>
        ${this._error ? `<div class="err">${this._esc(this._error)}</div>` : ''}
      </div>`;
  }

  _bindDetail(l, prevValue) {
    const sr = this.shadowRoot;
    const select = sr.getElementById('who');
    const assignBtn = sr.querySelector('[data-act="assign"]');
    if (select) {
      if ([...select.options].some(o => o.value === prevValue)) select.value = prevValue;
      assignBtn.disabled = !select.value;
      select.onchange = () => { assignBtn.disabled = !select.value; };
    }
    sr.querySelectorAll('[data-unassign]').forEach(b => b.onclick = () =>
      this._call('unassign', l.id, { recipient_id: b.dataset.unassign }));
    sr.querySelectorAll('[data-act]').forEach(b => b.onclick = () => {
      const act = b.dataset.act;
      if (act === 'close') { this._selected = null; this._render(); return; }
      if (act === 'assign') { if (select.value) this._call('assign', l.id, { recipient_id: select.value }); return; }
      if (act === 'notify') return this._call('notify', l.id);
      if (act === 'open') {
        if (confirm(`Ouvrir la serrure du casier ${l.id} ?`)) this._call('open', l.id);
        return;
      }
      if (act === 'reset') {
        const msg = l.people.length
          ? `Libérer le casier ${l.id} ? Le code et les destinataires seront effacés.`
          : `Libérer le casier ${l.id} ?`;
        if (confirm(msg)) this._call('reset', l.id);
        return;
      }
      if (act === 'hs') {
        if (confirm(`Mettre le casier ${l.id} hors service ?\nLe code et le badge ne l'ouvriront plus.`))
          this._call('set_out_of_service', l.id, { out_of_service: true });
        return;
      }
      if (act === 'unhs') this._call('set_out_of_service', l.id, { out_of_service: false });
    });
  }

  async _call(service, id, extra = {}) {
    this._error = '';
    try {
      await this._hass.callService('smart_locker', service, { locker_id: id, ...extra });
    } catch (err) {
      this._error = err.message || String(err);
      this._render();
    }
  }

  _esc(s) {
    return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  getCardSize() { return 4; }
}

customElements.define('smart-locker-lockers-card', SmartLockerLockersCard);

window.customCards.push({
  type:        'smart-locker-lockers-card',
  name:        'Smart Locker — Casiers',
  description: 'Vue d\'ensemble de tous les casiers, détail et actions au toucher',
  preview:     false,
});

// ─── Carte matériel : choix, état et test de chaque équipement ───────────────

const HCSS = RCSS + `
  .sec { border: 1px solid var(--divider-color); border-radius: 10px; padding: 10px 12px; margin-bottom: 12px; }
  .sec-h { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
  .sec-h ha-icon { --mdc-icon-size: 20px; color: var(--primary-color); }
  .sec-h .t { font-weight: 600; flex: 1; }
  .pill { font-size: 0.72em; font-weight: 600; padding: 2px 8px; border-radius: 10px; white-space: nowrap;
          background: var(--secondary-background-color); color: var(--secondary-text-color); }
  .pill.on { background: #43A04722; color: #2E7D32; }
  .pill.off { background: #E5393522; color: #C62828; }
  .field { min-width: 0; margin-bottom: 8px; display: flex; flex-direction: column; gap: 3px; }
  .field label { font-size: 0.75em; color: var(--secondary-text-color); font-weight: 500; }
  .field select, .field input {
    width: 100%; box-sizing: border-box; padding: 7px 8px; border-radius: 6px; font-size: 0.88em;
    border: 1px solid var(--divider-color); background: var(--card-background-color); color: var(--primary-text-color);
  }
  .hint { font-size: 0.72em; color: var(--secondary-text-color); }
  .hint.warn { color: #E65100; }
  .nums { display: grid; grid-template-columns: repeat(auto-fit, minmax(95px, 1fr)); gap: 8px; }
  .row-btns { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 4px; }
  .r-btn ha-icon { --mdc-icon-size: 16px; color: inherit; vertical-align: -3px; margin-right: 3px; }
  .links { display: flex; flex-direction: column; margin-top: 6px; }
  .link { display: grid; grid-template-columns: 2.6em 1fr 1fr 34px; gap: 6px; align-items: center;
          padding: 5px 0; border-bottom: 1px solid var(--divider-color); font-size: 0.8em; }
  .link:last-child { border-bottom: none; }
  .link.head { font-weight: 600; color: var(--secondary-text-color); font-size: 0.72em; }
  .link .c { font-weight: 700; }
  .ok, .ko { display: flex; flex-direction: column; min-width: 0; }
  .ok b { color: #2E7D32; } .ko b { color: #C62828; }
  .ok small, .ko small { color: var(--secondary-text-color); overflow: hidden; text-overflow: ellipsis;
                         white-space: nowrap; font-family: monospace; font-size: 0.85em; }
  .test-res { grid-column: 1 / -1; font-size: 0.85em; padding: 2px 0 2px 2.9em; }
  .test-res.ok { color: #2E7D32; } .test-res.ko { color: #C62828; } .test-res.wait { color: var(--secondary-text-color); }
  .log { margin-top: 8px; border-radius: 8px; background: var(--secondary-background-color); padding: 8px 10px; }
  .log-h { display: flex; align-items: center; gap: 8px; font-size: 0.8em; font-weight: 600; margin-bottom: 4px; }
  .log-h span { flex: 1; }
  .log ul { list-style: none; margin: 0; padding: 0; font-size: 0.85em; }
  .log li { padding: 3px 0; border-top: 1px solid var(--divider-color); }
  .log li:first-child { border-top: none; }
  .log .tm { color: var(--secondary-text-color); font-family: monospace; font-size: 0.85em; margin-right: 6px; }
  .log .other { color: #E65100; font-size: 0.85em; }
  .log .empty { color: var(--secondary-text-color); font-style: italic; }
  .save { display: flex; align-items: center; gap: 8px; justify-content: flex-end; }
  .status { font-size: 0.78em; color: var(--secondary-text-color); margin-right: auto; }
  .status.err { color: #C62828; }
`;

const DOOR_TEST_SECONDS = 10;

class SmartLockerHardwareCard extends HTMLElement {
  static getStubConfig() { return {}; }
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._data = null;
    this._sig = '';
    this._doorTests = {};   // locker -> {state: wait|ok|ko|info, text, timer}
    this._log = null;       // null = mode test inactif
  }

  setConfig(config) { this._config = config || {}; }

  set hass(hass) {
    this._hass = hass;
    if (!this._loaded) { this._loaded = true; this._load(); return; }
    if (!this._data) return;
    const sig = Object.values(this._data.relay.lockers)
      .map(l => (l.door && hass.states[l.door] ? hass.states[l.door].state : '')).join(',');
    if (sig !== this._sig) { this._sig = sig; this._checkDoorTests(); this._renderLinks(); }
  }

  async _load(keepStatus) {
    try {
      const [data, settings] = await Promise.all([
        this._hass.callWS({ type: 'smart_locker/hardware/status' }),
        this._hass.callWS({ type: 'smart_locker/settings/get' }),
      ]);
      this._data = data;
      this._settings = settings;
    } catch (err) {
      this.shadowRoot.innerHTML = `<style>${HCSS}</style><ha-card><p class="status err">Erreur : ${this._esc(err.message || err)}</p></ha-card>`;
      return;
    }
    const status = keepStatus && this.shadowRoot.getElementById('status');
    const prev = status ? [status.textContent, status.className] : null;
    this._render();
    if (prev) { const st = this.shadowRoot.getElementById('status'); [st.textContent, st.className] = prev; }
  }

  // ── Rendu ──────────────────────────────────────────────────────────────

  _pill(online, labels = ['En ligne', 'Hors ligne', 'Inconnu']) {
    return online === true ? `<span class="pill on">● ${labels[0]}</span>`
      : online === false ? `<span class="pill off">● ${labels[1]}</span>`
      : `<span class="pill">● ${labels[2]}</span>`;
  }

  _devOptions(selected, emptyLabel) {
    const d = this._data;
    return [
      `<option value="">${emptyLabel}</option>`,
      ...d.esphome.map(e => `<option value="${this._esc(e.device_id)}" ${e.device_id === selected ? 'selected' : ''}>
        ${this._esc(e.name)}${e.model ? ` · ${this._esc(e.model)}` : ''}</option>`),
      ...(selected && !d.esphome.some(e => e.device_id === selected)
        ? [`<option value="${this._esc(selected)}" selected>⚠ Appareil introuvable</option>`] : []),
    ].join('');
  }

  _render() {
    const d = this._data, s = this._settings;
    const relayName = (d.esphome.find(e => e.device_id === d.relay.device_id) || {}).name;
    const relayHint = {
      selected: ['', 'Appareil choisi.'],
      auto: ['', `Détectée automatiquement : ${relayName || '?'}.`],
      legacy: ['', 'Anciens noms d\'entités (button.smart_locker_relais_…). Choisir l\'appareil est plus sûr.'],
      none: ['warn', 'Aucune carte relais trouvée : vérifier l\'intégration ESPHome.'],
    }[d.relay.source] || ['', ''];
    const wledOptions = [
      `<option value="">Aucun (LED désactivées)</option>`,
      ...d.wled.map(w => `<option value="${this._esc(w.entry_id)}" ${w.entry_id === s.led_entry_id ? 'selected' : ''}>
        ${this._esc(w.title)}${w.host ? ` (${this._esc(w.host)})` : ''}</option>`),
      ...(s.led_entry_id && !d.wled.some(w => w.entry_id === s.led_entry_id)
        ? [`<option value="${this._esc(s.led_entry_id)}" selected>⚠ Appareil introuvable</option>`] : []),
    ].join('');
    const l = d.leds;
    const ledOnline = !l.configured ? null : l.last_error ? false : l.last_ok ? true : null;
    const ledHint = !l.configured ? ['warn', 'Aucun contrôleur : les LED sont désactivées.']
      : l.last_error ? ['warn', `Dernier envoi en échec : ${l.last_error}`]
      : l.last_ok ? ['', `Dernier envoi réussi à ${new Date(l.last_ok).toLocaleTimeString()}.`]
      : ['', 'Pas encore d\'envoi depuis le démarrage : cliquer Tester.'];
    const num = (id, label, value, min, max) => `
      <div class="field"><label>${label}</label>
        <input id="${id}" type="number" min="${min}" max="${max}" value="${this._esc(value)}"></div>`;

    this.shadowRoot.innerHTML = `
      <style>${HCSS}</style>
      <ha-card>
        <div class="card-header">
          <div class="card-title"><ha-icon icon="mdi:chip"></ha-icon>Matériel</div>
          <button class="r-icon-btn" id="b-reload" title="Actualiser"><ha-icon icon="mdi:refresh"></ha-icon></button>
        </div>

        <div class="sec">
          <div class="sec-h"><ha-icon icon="mdi:electric-switch"></ha-icon><span class="t">Carte relais</span>
            ${this._pill(d.relay.online)}</div>
          <div class="field"><label>Appareil (serrures et portes)</label>
            <select id="f-relay">${this._devOptions(s.relay_device_id, 'Détection automatique')}</select>
            <span class="hint ${relayHint[0]}">${this._esc(relayHint[1])}</span></div>
          <div class="links" id="links"></div>
          <span class="hint">Test : actionne la serrure et vérifie que le capteur voit la porte s'ouvrir.</span>
        </div>

        <div class="sec">
          <div class="sec-h"><ha-icon icon="mdi:dialpad"></ha-icon><span class="t">Digicode</span>
            ${this._pill(d.keypad.online, ['En ligne', 'Hors ligne', 'Non choisi'])}</div>
          <div class="field"><label>Appareil</label>
            <select id="f-keypad">${this._devOptions(s.keypad_device_id, 'Tous les appareils ESPHome (non filtré)')}</select>
            <span class="hint">Une fois choisi, seuls ses codes et badges sont pris en compte.</span></div>
          <div class="row-btns"><button class="r-btn r-btn-secondary" id="b-kt">
            <ha-icon icon="mdi:test-tube"></ha-icon>Mode test</button></div>
          <div id="kt"></div>
        </div>

        <div class="sec">
          <div class="sec-h"><ha-icon icon="mdi:led-strip-variant"></ha-icon><span class="t">Éclairage</span>
            ${this._pill(ledOnline, ['Joignable', 'Injoignable', l.configured ? 'Non testé' : 'Désactivé'])}</div>
          <div class="field"><label>Contrôleur WLED</label><select id="f-wled">${wledOptions}</select>
            <span class="hint ${ledHint[0]}">${this._esc(ledHint[1])}</span></div>
          <div class="nums">
            ${num('f-bri', 'Luminosité', s.led_brightness, 1, 255)}
            ${num('f-timeout', 'Allumage (s)', s.led_timeout, 5, 3600)}
            ${num('f-door', 'Alerte porte (s)', s.door_alert_delay, 5, 3600)}
          </div>
          <div class="row-btns">
            <button class="r-btn r-btn-secondary" id="b-led-test"><ha-icon icon="mdi:lightbulb-on-outline"></ha-icon>Tester</button>
            <button class="r-btn r-btn-secondary" id="b-led-tour"><ha-icon icon="mdi:numeric"></ha-icon>Parcours</button>
            <span class="hint" id="tour"></span>
          </div>
        </div>

        <div class="save">
          <span class="status" id="status"></span>
          <button class="r-btn r-btn-primary" id="b-save">Enregistrer</button>
        </div>
      </ha-card>`;
    const sr = this.shadowRoot;
    sr.getElementById('b-save').onclick = () => this._save();
    sr.getElementById('b-reload').onclick = () => this._load();
    sr.getElementById('b-kt').onclick = () => (this._log ? this._stopKeypadTest() : this._startKeypadTest());
    sr.getElementById('b-led-test').onclick = () => this._ledTest();
    sr.getElementById('b-led-tour').onclick = () => (this._tour ? this._stopTour() : this._ledTour());
    this._renderLinks();
    this._renderKeypadTest();
  }

  _renderLinks() {
    const box = this.shadowRoot.getElementById('links');
    if (!box || !this._data) return;
    const cell = (entity, okLabel) => entity
      ? `<span class="ok"><b>✓ ${okLabel}</b><small title="${this._esc(entity)}">${this._esc(entity)}</small></span>`
      : `<span class="ko"><b>✗ Introuvable</b><small>—</small></span>`;
    const doorLabel = entity => {
      const st = entity && this._hass.states[entity];
      return !st ? 'OK' : st.state === 'on' ? 'Ouverte' : st.state === 'off' ? 'Fermée' : st.state;
    };
    box.innerHTML = `<div class="link head"><span>Casier</span><span>Ouverture</span><span>Porte</span><span></span></div>`
      + Object.entries(this._data.relay.lockers).map(([id, l]) => {
        const t = this._doorTests[id];
        return `<div class="link"><span class="c">${this._esc(id)}</span>
          ${cell(l.button, 'OK')}${cell(l.door, doorLabel(l.door))}
          <button class="r-icon-btn" data-test="${this._esc(id)}" title="Tester le casier ${this._esc(id)}"
            ${l.button ? '' : 'disabled'}><ha-icon icon="mdi:play-circle-outline"></ha-icon></button>
          ${t ? `<span class="test-res ${t.state}">${this._esc(t.text)}</span>` : ''}</div>`;
      }).join('');
    box.querySelectorAll('[data-test]').forEach(b => b.onclick = () => this._testLocker(b.dataset.test));
  }

  // ── Test d'un casier : serrure + capteur de porte ──────────────────────

  async _testLocker(id) {
    const l = this._data.relay.lockers[id];
    if (!confirm(`Tester le casier ${id} ?\nLa serrure va s'ouvrir.`)) return;
    const door = l.door && this._hass.states[l.door];
    if (door && door.state === 'on') {
      this._setTest(id, 'ko', 'Porte déjà ouverte : la refermer puis relancer le test.');
      return;
    }
    try {
      await this._hass.callService('smart_locker', 'open', { locker_id: Number(id) });
    } catch (err) {
      this._setTest(id, 'ko', `Échec : ${err.message || err}`);
      return;
    }
    if (!l.door) { this._setTest(id, 'info', 'Serrure actionnée. Pas de capteur de porte à vérifier.'); return; }
    this._setTest(id, 'wait', `Serrure actionnée, attente de l'ouverture de la porte (${DOOR_TEST_SECONDS} s)…`);
    this._doorTests[id].timer = setTimeout(() => {
      if (this._doorTests[id] && this._doorTests[id].state === 'wait')
        this._setTest(id, 'ko', 'Porte non détectée : serrure bloquée, relais, ou capteur de porte (aimant, câblage).');
    }, DOOR_TEST_SECONDS * 1000);
  }

  _setTest(id, state, text) {
    const prev = this._doorTests[id];
    if (prev && prev.timer && state !== 'wait') clearTimeout(prev.timer);
    this._doorTests[id] = { state, text };
    this._renderLinks();
  }

  _checkDoorTests() {
    for (const [id, t] of Object.entries(this._doorTests)) {
      const door = this._data.relay.lockers[id].door;
      if (t.state === 'wait' && door && this._hass.states[door] && this._hass.states[door].state === 'on')
        this._setTest(id, 'ok', '✓ Serrure et capteur OK : porte vue ouverte.');
    }
  }

  // ── Mode test du digicode ──────────────────────────────────────────────

  async _startKeypadTest() {
    this._log = [];
    try {
      this._ktUnsub = await this._hass.connection.subscribeMessage(
        ev => this._onKeypadEvent(ev), { type: 'smart_locker/hardware/keypad_test' });
    } catch (err) {
      this._log = null;
      this._status(`Mode test impossible : ${err.message || err}`, true);
    }
    this._renderKeypadTest();
  }

  async _stopKeypadTest() {
    clearInterval(this._ktTimer);
    const unsub = this._ktUnsub;
    this._ktUnsub = null;
    this._log = null;
    if (unsub) { try { await unsub(); } catch (_) { /* connexion fermée */ } }
    this._renderKeypadTest();
  }

  _onKeypadEvent(ev) {
    if (ev.type === 'start') {
      this._ktLeft = ev.timeout;
      clearInterval(this._ktTimer);
      this._ktTimer = setInterval(() => { this._ktLeft = Math.max(0, this._ktLeft - 1); this._renderKeypadTest(); }, 1000);
    } else if (ev.type === 'end') {
      this._stopKeypadTest();
      return;
    } else if (ev.type === 'key' && this._log[0] && this._log[0].type === 'key') {
      this._log[0].count += 1;          // touches successives regroupées
      this._log[0].time = new Date();
    } else {
      this._log.unshift({ ...ev, count: 1, time: new Date() });
      this._log = this._log.slice(0, 12);
    }
    this._renderKeypadTest();
  }

  _describe(e) {
    const where = ids => ids && ids.length ? `→ casier${ids.length > 1 ? 's' : ''} ${ids.join(', ')}` : '';
    switch (e.type) {
      case 'key': return `${'•'.repeat(Math.min(e.count, 6))} ${e.count} touche${e.count > 1 ? 's' : ''}`;
      case 'code': return `Code <b>${this._esc(e.code)}</b> ${e.lockers.length ? this._esc(where(e.lockers)) : '→ aucun casier (serait refusé)'}`;
      case 'badge': return `Badge <b>${this._esc(e.badge_id)}</b> → ${e.recipient
        ? `${this._esc(e.recipient)}${e.lockers.length ? `, ${this._esc(where(e.lockers).slice(2))}` : ', aucun colis'}`
        : 'inconnu (serait refusé)'}`;
      case 'timeout': return 'Saisie abandonnée (10 s sans touche)';
      default: return this._esc(e.type);
    }
  }

  _renderKeypadTest() {
    const box = this.shadowRoot.getElementById('kt');
    const btn = this.shadowRoot.getElementById('b-kt');
    if (!box) return;
    if (btn) btn.innerHTML = this._log
      ? '<ha-icon icon="mdi:stop-circle-outline"></ha-icon>Arrêter le test'
      : '<ha-icon icon="mdi:test-tube"></ha-icon>Mode test';
    if (!this._log) { box.innerHTML = ''; return; }
    box.innerHTML = `
      <div class="log">
        <div class="log-h"><span>Tapez un code ou passez un badge : rien ne s'ouvre pendant le test.</span>
          <span style="flex:0;white-space:nowrap">${this._ktLeft ?? ''}${this._ktLeft !== undefined ? ' s' : ''}</span></div>
        <ul>${this._log.length ? this._log.map(e => `
          <li><span class="tm">${e.time.toLocaleTimeString()}</span>${this._describe(e)}
            ${e.accepted ? '' : `<div class="other">Autre appareil (${this._esc(e.device)}) : ignoré en fonctionnement normal</div>`}</li>`).join('')
          : '<li class="empty">En attente…</li>'}</ul>
      </div>`;
  }

  // ── Diagnostic de l'éclairage ──────────────────────────────────────────

  async _ledTest() {
    try {
      await this._hass.callWS({ type: 'smart_locker/leds/test' });
      this._status('Éclairage allumé, vérification de la réponse du WLED…');
      setTimeout(() => this._load(true), 1500);
    } catch (err) { this._status(`Erreur : ${err.message || err}`, true); }
  }

  async _ledTour() {
    const ids = Object.keys(this._data.relay.lockers).map(Number);
    const tour = this._tour = { stop: false };
    const label = this.shadowRoot.getElementById('tour');
    const btn = this.shadowRoot.getElementById('b-led-tour');
    btn.innerHTML = '<ha-icon icon="mdi:stop-circle-outline"></ha-icon>Arrêter';
    for (const id of ids) {
      if (tour.stop) break;
      label.textContent = `Casier ${id} allumé en blanc`;
      try { await this._hass.callWS({ type: 'smart_locker/leds/identify', locker_id: id }); }
      catch (err) { label.textContent = `Erreur : ${err.message || err}`; break; }
      await new Promise(r => setTimeout(r, 2200));
    }
    if (this._tour === tour) this._stopTour();
  }

  _stopTour() {
    if (this._tour) this._tour.stop = true;
    this._tour = null;
    const label = this.shadowRoot.getElementById('tour');
    const btn = this.shadowRoot.getElementById('b-led-tour');
    if (label) label.textContent = '';
    if (btn) btn.innerHTML = '<ha-icon icon="mdi:numeric"></ha-icon>Parcours';
  }

  // ── Enregistrement ─────────────────────────────────────────────────────

  async _save() {
    const sr = this.shadowRoot;
    const int = id => parseInt(sr.getElementById(id).value, 10);
    try {
      await this._hass.callWS({
        type: 'smart_locker/settings/set',
        relay_device_id:  sr.getElementById('f-relay').value,
        keypad_device_id: sr.getElementById('f-keypad').value,
        led_entry_id:     sr.getElementById('f-wled').value,
        led_brightness:   int('f-bri'),
        led_timeout:      int('f-timeout'),
        door_alert_delay: int('f-door'),
      });
      this._status('Enregistré ✓');
      await this._load(true);
    } catch (err) { this._status(`Erreur : ${err.message || err}`, true); }
  }

  _status(text, error = false) {
    const el = this.shadowRoot.getElementById('status');
    if (!el) return;
    el.textContent = text;
    el.className = `status${error ? ' err' : ''}`;
  }

  disconnectedCallback() { this._stopKeypadTest(); this._stopTour(); }

  _esc(s) {
    return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  getCardSize() { return 10; }
}

customElements.define('smart-locker-hardware-card', SmartLockerHardwareCard);

window.customCards.push({
  type:        'smart-locker-hardware-card',
  name:        'Smart Locker — Matériel',
  description: 'Carte relais, digicode et éclairage : choix, état et tests',
  preview:     false,
});
