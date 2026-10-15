const fs = require('fs');
const os = require('os');
const path = require('path');
const {
  PostsService,
  parsePosts,
  cleanText,
  fetchStats,
} = require('../services/posts');

const entry = (over = {}) => ({
  url: 'https://x.com/halfin/status/1110302988',
  name: 'Hal Finney',
  handle: 'halfin',
  date: '2009-01-11',
  text: 'Running bitcoin',
  theme: 'history',
  ...over,
});

describe('posts', () => {
  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => jest.restoreAllMocks());

  test('cleanText drops t.co links and leading @replies', () => {
    expect(
      cleanText(
        '@skwp @other Global savings. https://t.co/abc123 more https://t.co/x'
      )
    ).toBe('Global savings. more');
    expect(cleanText('Line one  \nLine two')).toBe('Line one\nLine two');
  });

  test('parsePosts maps entries to the panel shape and skips hidden or broken ones', () => {
    const posts = parsePosts({
      posts: [
        entry(),
        entry({ url: 'https://x.com/a/status/2', hidden: true }),
        entry({ url: 'not a status url' }),
        entry({ url: 'https://x.com/b/status/3', text: '' }),
      ],
    });
    expect(posts).toEqual([
      {
        id: '1110302988',
        url: 'https://x.com/halfin/status/1110302988',
        name: 'Hal Finney',
        handle: 'halfin',
        text: 'Running bitcoin',
        createdAt: '2009-01-11T00:00:00.000Z',
      },
    ]);
    expect(() => parsePosts({ nope: [] })).toThrow(/posts/);
  });

  test('fetchStats reads likes, replies and a larger avatar', async () => {
    const http = {
      get: jest.fn().mockResolvedValue({
        data: {
          __typename: 'Tweet',
          favorite_count: 133110,
          conversation_count: 11713,
          user: {
            profile_image_url_https:
              'https://pbs.twimg.com/profile_images/287413224/hal_normal.jpg',
          },
        },
      }),
    };
    await expect(fetchStats('1110302988', http)).resolves.toEqual({
      likes: 133110,
      replies: 11713,
      avatarUrl:
        'https://pbs.twimg.com/profile_images/287413224/hal_200x200.jpg',
    });
    expect(http.get.mock.calls[0][0]).toMatch(
      /tweet-result\?id=1110302988&token=/
    );
  });

  test('a broken file keeps the last good list, and stats merge into posts', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'posts-'));
    const file = path.join(dir, 'posts.json');
    fs.writeFileSync(file, JSON.stringify({ posts: [entry()] }));
    const http = {
      get: jest.fn().mockResolvedValue({
        data: {
          __typename: 'Tweet',
          favorite_count: 5,
          conversation_count: 1,
          user: {},
        },
      }),
    };
    const service = new PostsService({ file, stats: false, http });
    const changes = [];
    service.on('change', (list) => changes.push(list));

    expect(service.load()).toBe(true);
    fs.writeFileSync(file, '{ "posts": [');
    expect(service.load()).toBe(false);
    expect(service.getPosts()).toHaveLength(1);

    await service.refreshStats();
    expect(service.getPosts()[0]).toMatchObject({
      text: 'Running bitcoin',
      likes: 5,
      replies: 1,
      avatarUrl: null,
    });
    expect(changes).toHaveLength(2);
  });
});
