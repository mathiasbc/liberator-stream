const assert = require('node:assert/strict');
const { test } = require('node:test');
const {
  TitleUpdater,
  formatTitle,
  TOKEN_URL,
  BROADCASTS_URL,
} = require('../src/youtube-title');

const TEMPLATE = 'Bitcoin {price} {arrow} {change} · live 24/7';

test('fills the template, strips angle brackets, stays under 100 chars', () => {
  assert.equal(
    formatTitle(TEMPLATE, { price: 82201.4, change: 0.83 }),
    'Bitcoin $82,201 ▲ 0.8% · live 24/7'
  );
  assert.equal(
    formatTitle(TEMPLATE, { price: 79800, change: -3.25 }),
    'Bitcoin $79,800 ▼ 3.3% · live 24/7'
  );
  assert.equal(formatTitle('<b>{price}</b>', { price: 1 }), 'b$1/b');
  assert.equal(formatTitle('x'.repeat(120), { price: 1 }).length, 100);
});

// A fake fetch that answers the dashboard, Google's token endpoint and the
// broadcasts API, and records what was sent
const fakeFetch = ({ items }) => {
  const calls = [];
  const fetchImpl = async (url, init = {}) => {
    calls.push({ url, init });
    const json = (status, body) => ({
      ok: status < 400,
      status,
      json: async () => body,
    });
    if (url.endsWith('/api/cache'))
      return json(200, { currentPrice: 82201, priceChange: 0.83 });
    if (url === TOKEN_URL)
      return json(200, { access_token: 'at-1', expires_in: 3600 });
    if (url.startsWith(BROADCASTS_URL) && init.method === 'PUT')
      return json(200, {});
    if (url.startsWith(BROADCASTS_URL)) return json(200, { items });
    return json(404, {});
  };
  return { fetchImpl, calls };
};

const broadcast = {
  id: 'bc-1',
  snippet: {
    title: 'old title',
    description: 'keep me',
    scheduledStartTime: '2026-10-16T00:00:00Z',
    publishedAt: '2026-10-15T00:00:00Z',
    liveChatId: 'chat',
  },
};

test('updates the active broadcast, keeping its description', async () => {
  const { fetchImpl, calls } = fakeFetch({ items: [broadcast] });
  const updater = new TitleUpdater({
    clientId: 'id',
    clientSecret: 'secret',
    refreshToken: 'rt',
    titleTemplate: TEMPLATE,
    dashboardUrl: 'http://localhost:3001',
    fetchImpl,
  });
  await updater.tick();
  const put = calls.find((c) => c.init.method === 'PUT');
  assert.ok(put, 'sent an update');
  assert.equal(put.init.headers.Authorization, 'Bearer at-1');
  assert.deepEqual(JSON.parse(put.init.body), {
    id: 'bc-1',
    snippet: {
      title: 'Bitcoin $82,201 ▲ 0.8% · live 24/7',
      description: 'keep me',
      scheduledStartTime: '2026-10-16T00:00:00Z',
    },
  });
  const list = calls.find(
    (c) => c.url.startsWith(BROADCASTS_URL) && !c.init.method
  );
  assert.match(list.url, /broadcastStatus=active/);
  assert.doesNotMatch(list.url, /mine=/);
  const tokenCall = calls.find((c) => c.url === TOKEN_URL);
  assert.match(tokenCall.init.body, /grant_type=refresh_token/);

  // Same price again: nothing is sent, and the token is reused
  const before = calls.length;
  await updater.tick();
  assert.equal(calls.length, before + 1); // only the dashboard read
});

test('does nothing while no broadcast is active', async () => {
  const { fetchImpl, calls } = fakeFetch({ items: [] });
  const updater = new TitleUpdater({
    clientId: 'id',
    clientSecret: 'secret',
    refreshToken: 'rt',
    titleTemplate: TEMPLATE,
    dashboardUrl: 'http://localhost:3001',
    fetchImpl,
  });
  await updater.tick();
  assert.ok(!calls.some((c) => c.init.method === 'PUT'));
  assert.equal(updater.lastTitle, null);
});
