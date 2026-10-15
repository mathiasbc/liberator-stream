const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { EventEmitter } = require('events');

const DEFAULT_FILE = path.join(
  __dirname,
  '..',
  '..',
  '..',
  'content',
  'posts.json'
);
// Likes, replies and avatars are refreshed this often; the text never changes
const STATS_REFRESH_MS = 24 * 60 * 60 * 1000;
const STATS_FETCH_GAP_MS = 400;
const RELOAD_DEBOUNCE_MS = 500;

const statusId = (url) => (String(url || '').match(/status\/(\d+)/) || [])[1];

// What the panel shows: no t.co links (nobody can click them on a stream)
// and no leading @replies
const cleanText = (text) =>
  String(text || '')
    .replace(/\s*https?:\/\/t\.co\/\S+/g, '')
    .replace(/^(@\w+\s+)+/, '')
    .replace(/[ \t]+\n/g, '\n')
    .trim();

/**
 * Turns content/posts.json into the panel's `tweets` shape, skipping hidden
 * and malformed entries.
 */
const parsePosts = (doc) => {
  const entries = Array.isArray(doc) ? doc : doc && doc.posts;
  if (!Array.isArray(entries)) throw new Error('expected a "posts" array');
  const posts = [];
  for (const entry of entries) {
    if (!entry || entry.hidden) continue;
    const id = statusId(entry.url);
    const text = cleanText(entry.text);
    if (!id || !text || !entry.handle) {
      console.warn('[Posts] skipping an entry without url, handle or text');
      continue;
    }
    const date = entry.date ? new Date(`${entry.date}T00:00:00Z`) : null;
    posts.push({
      id,
      url: entry.url,
      name: entry.name || entry.handle,
      handle: entry.handle,
      text,
      createdAt: date && !isNaN(date) ? date.toISOString() : null,
    });
  }
  return posts;
};

// Token X's own embed script computes for its public syndication endpoint
const syndicationToken = (id) =>
  ((Number(id) / 1e15) * Math.PI).toString(36).replace(/(0+|\.)/g, '');

const fetchStats = async (id, http = axios) => {
  const { data: tweet } = await http.get(
    `https://cdn.syndication.twimg.com/tweet-result?id=${id}&token=${syndicationToken(id)}&lang=en`,
    { timeout: 15000 }
  );
  if (!tweet || tweet.__typename !== 'Tweet') throw new Error('not available');
  const avatar = tweet.user && tweet.user.profile_image_url_https;
  return {
    likes:
      typeof tweet.favorite_count === 'number' ? tweet.favorite_count : null,
    replies:
      typeof tweet.conversation_count === 'number'
        ? tweet.conversation_count
        : null,
    avatarUrl: avatar ? avatar.replace('_normal.', '_200x200.') : null,
  };
};

/**
 * The hand-picked posts for the ON X panel. Emits 'change' with the full
 * list whenever content/posts.json is edited or the daily stats arrive.
 * POSTS_FILE overrides the file; POST_STATS=off skips fetching likes,
 * replies and avatars from X.
 */
class PostsService extends EventEmitter {
  constructor({
    file = process.env.POSTS_FILE || DEFAULT_FILE,
    stats = process.env.POST_STATS !== 'off',
    http,
  } = {}) {
    super();
    this.file = file;
    this.statsEnabled = stats;
    this.http = http;
    this.posts = [];
    this.stats = new Map();
    this.watcher = null;
    this.reloadTimer = null;
    this.statsTimer = null;
    this.refreshing = false;
  }

  start() {
    this.load();
    this.watch();
    if (this.statsEnabled) {
      this.refreshStats();
      this.statsTimer = setInterval(
        () => this.refreshStats(),
        STATS_REFRESH_MS
      );
    }
  }

  stop() {
    if (this.watcher) this.watcher.close();
    clearTimeout(this.reloadTimer);
    clearInterval(this.statsTimer);
    this.watcher = null;
  }

  load() {
    try {
      this.posts = parsePosts(JSON.parse(fs.readFileSync(this.file, 'utf8')));
      console.log(`[Posts] loaded ${this.posts.length} posts`);
      this.emit('change', this.getPosts());
      return true;
    } catch (error) {
      // Keep showing the last good list while the file is mid-edit or broken
      console.error(`[Posts] could not load ${this.file}: ${error.message}`);
      return false;
    }
  }

  // Watch the folder: editors often save by replacing the file
  watch() {
    try {
      const name = path.basename(this.file);
      this.watcher = fs.watch(path.dirname(this.file), (event, changed) => {
        if (changed && changed !== name) return;
        clearTimeout(this.reloadTimer);
        this.reloadTimer = setTimeout(() => {
          if (this.load() && this.statsEnabled)
            this.refreshStats({ onlyNew: true });
        }, RELOAD_DEBOUNCE_MS);
      });
    } catch (error) {
      console.error(`[Posts] not watching for edits: ${error.message}`);
    }
  }

  async refreshStats({ onlyNew = false } = {}) {
    if (this.refreshing) return;
    this.refreshing = true;
    let updated = 0;
    let failed = 0;
    try {
      for (const post of this.posts) {
        if (onlyNew && this.stats.has(post.id)) continue;
        try {
          this.stats.set(post.id, await fetchStats(post.id, this.http));
          updated += 1;
        } catch {
          failed += 1; // keep the previous stats, if any
        }
        await new Promise((r) => setTimeout(r, STATS_FETCH_GAP_MS));
      }
    } finally {
      this.refreshing = false;
    }
    if (updated || failed) {
      console.log(
        `[Posts] stats updated for ${updated}, unavailable for ${failed}`
      );
    }
    if (updated) this.emit('change', this.getPosts());
  }

  getPosts() {
    return this.posts.map((post) => ({ ...post, ...this.stats.get(post.id) }));
  }
}

module.exports = { PostsService, parsePosts, cleanText, fetchStats };
