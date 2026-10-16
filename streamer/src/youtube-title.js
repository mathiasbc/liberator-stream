const log = require('./log');

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const BROADCASTS_URL = 'https://www.googleapis.com/youtube/v3/liveBroadcasts';
const TITLE_MAX = 100;

const formatUsd = (n) => `$${Math.round(n).toLocaleString('en-US')}`;

// Fills {price}, {arrow} and {change} in the template. YouTube titles can't
// contain < or > and stop at 100 characters.
const formatTitle = (template, { price, change }) => {
  const pct = typeof change === 'number' ? change : 0;
  return template
    .replace(/\{price\}/g, formatUsd(price))
    .replace(/\{arrow\}/g, pct >= 0 ? '▲' : '▼')
    .replace(/\{change\}/g, `${Math.abs(pct).toFixed(1)}%`)
    .replace(/[<>]/g, '')
    .trim()
    .slice(0, TITLE_MAX);
};

// An update replaces the whole snippet, so the fields we don't change are
// sent back as they are. The rest of a snippet is read-only.
const SNIPPET_FIELDS = [
  'title',
  'description',
  'scheduledStartTime',
  'scheduledEndTime',
];

/**
 * Keeps the live broadcast's title current with the price, e.g.
 * "Bitcoin $82,201 ▲ 0.8% · live 24/7", every few minutes. Each run costs
 * 51 quota units (a list and an update) against the API's default 10,000
 * a day, so every 10 minutes uses about three quarters of it.
 */
class TitleUpdater {
  constructor({
    clientId,
    clientSecret,
    refreshToken,
    titleTemplate,
    titleUpdateMinutes = 10,
    dashboardUrl,
    fetchImpl = fetch,
  }) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.refreshToken = refreshToken;
    this.template = titleTemplate;
    this.intervalMs = titleUpdateMinutes * 60 * 1000;
    this.dashboardUrl = dashboardUrl;
    this.fetch = fetchImpl;
    this.token = null;
    this.tokenExpiresAt = 0;
    this.lastTitle = null;
    this.timer = null;
    this.warnedIdle = false;
  }

  start() {
    log.info(
      `Live title updates every ${this.intervalMs / 60000} min: "${this.template}"`
    );
    this.tick();
    this.timer = setInterval(() => this.tick(), this.intervalMs);
  }

  stop() {
    clearInterval(this.timer);
    this.timer = null;
  }

  async tick() {
    try {
      const market = await this.readMarket();
      if (typeof market.price !== 'number') return;
      const title = formatTitle(this.template, market);
      if (title === this.lastTitle) return;
      const token = await this.accessToken();
      const broadcast = await this.activeBroadcast(token);
      if (!broadcast) {
        if (!this.warnedIdle) log.info('Live title: no active broadcast yet');
        this.warnedIdle = true;
        return;
      }
      this.warnedIdle = false;
      await this.updateTitle(token, broadcast, title);
      this.lastTitle = title;
      log.info(`Live title: ${title}`);
    } catch (err) {
      log.warn(`Live title update failed: ${err.message}`);
    }
  }

  async readMarket() {
    const res = await this.fetch(`${this.dashboardUrl}/api/cache`, {
      signal: AbortSignal.timeout(5000),
    });
    const data = await res.json();
    return { price: data.currentPrice, change: data.priceChange };
  }

  async accessToken() {
    if (this.token && Date.now() < this.tokenExpiresAt - 60000) {
      return this.token;
    }
    const res = await this.fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        refresh_token: this.refreshToken,
        grant_type: 'refresh_token',
      }).toString(),
    });
    const body = await res.json();
    if (!res.ok || !body.access_token) {
      throw new Error(
        `token refresh: ${body.error_description || body.error || res.status}`
      );
    }
    this.token = body.access_token;
    this.tokenExpiresAt = Date.now() + (body.expires_in || 3600) * 1000;
    return this.token;
  }

  async activeBroadcast(token) {
    const res = await this.fetch(
      // broadcastStatus already means "this channel's"; adding mine=true is rejected
      `${BROADCASTS_URL}?part=id,snippet&broadcastStatus=active`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const body = await res.json();
    if (!res.ok) {
      throw new Error(`broadcast list: ${body.error?.message || res.status}`);
    }
    return (body.items || [])[0] || null;
  }

  async updateTitle(token, broadcast, title) {
    const snippet = {};
    for (const field of SNIPPET_FIELDS) {
      if (broadcast.snippet?.[field] !== undefined) {
        snippet[field] = broadcast.snippet[field];
      }
    }
    snippet.title = title;
    const res = await this.fetch(`${BROADCASTS_URL}?part=snippet`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ id: broadcast.id, snippet }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(`broadcast update: ${body.error?.message || res.status}`);
    }
  }
}

module.exports = { TitleUpdater, formatTitle, TOKEN_URL, BROADCASTS_URL };
