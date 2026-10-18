const assert = require('node:assert/strict');
const { test } = require('node:test');
const { BroadcastKeeper } = require('../src/youtube-broadcast');

const ended = {
  id: 'old-1',
  snippet: {
    title: '🔴 Bitcoin LIVE $81,107',
    description: 'Bitcoin price LIVE, 24/7.',
    actualEndTime: '2026-10-18T21:47:30Z',
    thumbnails: {},
  },
  status: { privacyStatus: 'public' },
  contentDetails: {
    boundStreamId: 'stream-1',
    enableDvr: true,
    latencyPreference: 'normal',
    enableAutoStop: true,
  },
};

// A fake YouTube API with configurable state; records every call
const fakeApi = ({
  active = [],
  upcoming = [],
  streams = [],
  completed = [ended],
} = {}) => {
  const calls = [];
  const fetchImpl = async (url, init = {}) => {
    calls.push({ url, init });
    const json = (body, status = 200) => ({
      ok: status < 400,
      status,
      json: async () => body,
    });
    const u = new URL(url);
    if (u.pathname.endsWith('/liveBroadcasts') && init.method === 'POST') {
      return json({ id: 'new-1', ...JSON.parse(init.body) });
    }
    if (u.pathname.endsWith('/liveBroadcasts')) {
      const status = u.searchParams.get('broadcastStatus');
      return json({ items: { active, upcoming, completed }[status] || [] });
    }
    if (u.pathname.endsWith('/liveBroadcasts/bind'))
      return json({ id: 'new-1' });
    if (u.pathname.endsWith('/liveStreams')) return json({ items: streams });
    if (u.pathname.endsWith('/videos') && init.method === 'PUT')
      return json({});
    if (u.pathname.endsWith('/videos')) {
      return json({
        items: [
          {
            snippet: {
              title: 't',
              categoryId: '27',
              tags: ['bitcoin'],
              defaultLanguage: 'en',
            },
            status: { privacyStatus: 'public', license: 'youtube' },
          },
        ],
      });
    }
    if (u.pathname.endsWith('/thumbnails/set')) return json({});
    return json({}, 404);
  };
  return { calls, fetchImpl };
};

const keeper = (api) =>
  new BroadcastKeeper({
    getToken: async () => 'tok',
    fetchImpl: api.fetchImpl,
  });

test('does nothing while a broadcast is live or about to start', async () => {
  assert.equal(
    await keeper(fakeApi({ active: [{ id: 'x' }] })).ensureLive(),
    'live'
  );
  assert.equal(
    await keeper(fakeApi({ upcoming: [{ id: 'y' }] })).ensureLive(),
    'starting'
  );
});

test('waits while YouTube receives no video', async () => {
  const api = fakeApi({
    streams: [{ id: 'stream-1', status: { streamStatus: 'inactive' } }],
  });
  assert.equal(await keeper(api).ensureLive(), 'no-data');
  assert.ok(!api.calls.some((c) => c.init.method === 'POST'));
});

test('opens a new broadcast with auto-stop off when video arrives with none live', async () => {
  const api = fakeApi({
    streams: [{ id: 'stream-1', status: { streamStatus: 'active' } }],
  });
  assert.equal(await keeper(api).ensureLive(), 'created');

  const insert = api.calls.find(
    (c) => c.init.method === 'POST' && c.url.includes('/liveBroadcasts?')
  );
  const body = JSON.parse(insert.init.body);
  assert.equal(body.snippet.title, '🔴 Bitcoin LIVE $81,107');
  assert.equal(body.snippet.description, 'Bitcoin price LIVE, 24/7.');
  assert.equal(body.status.privacyStatus, 'public');
  assert.equal(body.status.selfDeclaredMadeForKids, false);
  assert.equal(body.contentDetails.enableAutoStart, true);
  assert.equal(body.contentDetails.enableAutoStop, false);
  assert.equal(body.contentDetails.latencyPreference, 'normal');

  const bind = api.calls.find((c) => c.url.includes('/liveBroadcasts/bind'));
  assert.match(bind.url, /id=new-1&streamId=stream-1/);

  const video = api.calls.find((c) => c.init.method === 'PUT');
  const v = JSON.parse(video.init.body);
  assert.equal(v.id, 'new-1');
  assert.equal(v.snippet.categoryId, '27');
  assert.deepEqual(v.snippet.tags, ['bitcoin']);
  assert.equal(v.status.selfDeclaredMadeForKids, false);
});
