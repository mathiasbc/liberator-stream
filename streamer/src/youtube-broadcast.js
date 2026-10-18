const fs = require('fs');
const log = require('./log');

const API = 'https://www.googleapis.com/youtube/v3';
const UPLOAD_API = 'https://www.googleapis.com/upload/youtube/v3';

/**
 * Keeps a live broadcast open while the streamer is sending video.
 *
 * YouTube ends a broadcast when the connection drops if it was created with
 * auto-stop on, and Studio doesn't show that switch for "Stream" broadcasts.
 * When YouTube is receiving our video but no broadcast is live, this
 * creates a new one with auto-start on and auto-stop off, copying the last
 * broadcast's title, description, visibility, category, tags and language,
 * binds it to the stream key that's receiving data, and sets the
 * thumbnail. Each check costs 1 quota unit; a new broadcast about 200.
 */
class BroadcastKeeper {
  constructor({ getToken, thumbnailFile = null, fetchImpl = fetch }) {
    this.getToken = getToken;
    this.thumbnailFile = thumbnailFile;
    this.fetch = fetchImpl;
    this.busy = false;
  }

  async api(path, init = {}) {
    const token = await this.getToken();
    const res = await this.fetch(`${API}${path}`, {
      ...init,
      headers: { Authorization: `Bearer ${token}`, ...(init.headers || {}) },
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok)
      throw new Error(
        `${path.split('?')[0]}: ${body.error?.message || res.status}`
      );
    return body;
  }

  broadcasts(status, parts = 'id,snippet,status,contentDetails') {
    return this.api(
      `/liveBroadcasts?part=${parts}&broadcastStatus=${status}&broadcastType=all&maxResults=10`
    ).then((b) => b.items || []);
  }

  /**
   * Returns 'live' (a broadcast is live), 'starting' (one is waiting to go
   * live), 'no-data' (YouTube isn't receiving our video yet), 'created' or
   * 'busy'.
   */
  async ensureLive() {
    if (this.busy) return 'busy';
    this.busy = true;
    try {
      if ((await this.broadcasts('active', 'id')).length) return 'live';
      if ((await this.broadcasts('upcoming', 'id')).length) return 'starting';

      const streams =
        (await this.api('/liveStreams?part=id,status&mine=true')).items || [];
      const stream = streams.find((s) => s.status?.streamStatus === 'active');
      if (!stream) return 'no-data';

      const template = await this.lastBroadcast(stream.id);
      if (!template) {
        log.warn(
          'Broadcast keeper: no earlier broadcast to copy settings from'
        );
        return 'no-data';
      }
      await this.createFrom(template, stream.id);
      return 'created';
    } finally {
      this.busy = false;
    }
  }

  // The most recently ended broadcast, preferring one on the same stream key
  async lastBroadcast(streamId) {
    const done = await this.broadcasts('completed');
    const ended = (b) =>
      Date.parse(b.snippet?.actualEndTime || b.snippet?.publishedAt || 0);
    done.sort((a, b) => ended(b) - ended(a));
    return (
      done.find((b) => b.contentDetails?.boundStreamId === streamId) ||
      done[0] ||
      null
    );
  }

  async createFrom(template, streamId) {
    const snippet = template.snippet || {};
    const details = template.contentDetails || {};
    const created = await this.api(
      '/liveBroadcasts?part=id,snippet,status,contentDetails',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          snippet: {
            title: snippet.title,
            description: snippet.description || '',
            scheduledStartTime: new Date().toISOString(),
          },
          status: {
            privacyStatus: template.status?.privacyStatus || 'public',
            selfDeclaredMadeForKids: false,
          },
          contentDetails: {
            enableAutoStart: true,
            enableAutoStop: false,
            enableDvr: details.enableDvr !== false,
            enableEmbed: details.enableEmbed !== false,
            recordFromStart: details.recordFromStart !== false,
            latencyPreference: details.latencyPreference || 'normal',
            monitorStream: { enableMonitorStream: false },
          },
        }),
      }
    );
    await this.api(
      `/liveBroadcasts/bind?id=${created.id}&streamId=${streamId}&part=id,contentDetails`,
      { method: 'POST' }
    );
    log.info(
      `Broadcast keeper: started a new broadcast ${created.id} (auto-stop off)`
    );

    // Video-level settings the broadcast API doesn't carry over
    try {
      await this.copyVideoSettings(template.id, created.id);
    } catch (err) {
      log.warn(`Broadcast keeper: video settings not copied: ${err.message}`);
    }
    try {
      await this.setThumbnail(created.id, template);
    } catch (err) {
      log.warn(`Broadcast keeper: thumbnail not set: ${err.message}`);
    }
    return created.id;
  }

  async copyVideoSettings(fromId, toId) {
    const old = ((await this.api(`/videos?part=snippet,status&id=${fromId}`))
      .items || [])[0];
    if (!old) return;
    const s = old.snippet || {};
    const snippet = {
      title: s.title,
      description: s.description || '',
      categoryId: s.categoryId || '27',
    };
    for (const key of ['tags', 'defaultLanguage', 'defaultAudioLanguage']) {
      if (s[key] !== undefined) snippet[key] = s[key];
    }
    const status = {
      privacyStatus: old.status?.privacyStatus || 'public',
      selfDeclaredMadeForKids: false,
    };
    for (const key of ['license', 'embeddable', 'publicStatsViewable']) {
      if (old.status?.[key] !== undefined) status[key] = old.status[key];
    }
    await this.api('/videos?part=snippet,status', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: toId, snippet, status }),
    });
  }

  // The local thumbnail file if there is one, otherwise the old broadcast's
  async setThumbnail(videoId, template) {
    let image = null;
    let type = 'image/png';
    if (this.thumbnailFile && fs.existsSync(this.thumbnailFile)) {
      image = fs.readFileSync(this.thumbnailFile);
      if (/\.jpe?g$/i.test(this.thumbnailFile)) type = 'image/jpeg';
    } else {
      const t = template.snippet?.thumbnails || {};
      const url = (t.maxres || t.standard || t.high || {}).url;
      if (!url) return;
      const res = await this.fetch(url);
      if (!res.ok) return;
      image = Buffer.from(await res.arrayBuffer());
      type = 'image/jpeg';
    }
    const token = await this.getToken();
    const res = await this.fetch(
      `${UPLOAD_API}/thumbnails/set?videoId=${videoId}`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': type },
        body: image,
      }
    );
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error?.message || `HTTP ${res.status}`);
    }
  }
}

module.exports = { BroadcastKeeper };
