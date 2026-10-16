// One-time sign-in that lets the streamer update the live title. Opens
// Google's consent page, receives the code on a local port, trades it for a
// refresh token and stores it in stream.env. Run with: make youtube-auth
const crypto = require('crypto');
const fs = require('fs');
const http = require('http');
const { execFile } = require('child_process');
const { loadConfig } = require('./config');
const { TOKEN_URL } = require('./youtube-title');

const SCOPE = 'https://www.googleapis.com/auth/youtube.force-ssl';

const waitForCode = (server, redirect, state) =>
  new Promise((resolve, reject) => {
    server.on('request', (req, res) => {
      const url = new URL(req.url, redirect);
      if (url.searchParams.get('state') !== state) {
        res.writeHead(400).end('Unexpected request');
        return;
      }
      const error = url.searchParams.get('error');
      res
        .writeHead(200, { 'Content-Type': 'text/plain' })
        .end(
          error ? `Sign-in failed: ${error}` : 'Done. You can close this tab.'
        );
      server.close();
      if (error) reject(new Error(error));
      else resolve(url.searchParams.get('code'));
    });
  });

const saveRefreshToken = (envFile, token) => {
  const line = `YOUTUBE_REFRESH_TOKEN=${token}`;
  let text = fs.existsSync(envFile) ? fs.readFileSync(envFile, 'utf8') : '';
  if (/^#?\s*YOUTUBE_REFRESH_TOKEN=.*$/m.test(text)) {
    text = text.replace(/^#?\s*YOUTUBE_REFRESH_TOKEN=.*$/m, line);
  } else {
    text = `${text.replace(/\n?$/, '\n')}${line}\n`;
  }
  fs.writeFileSync(envFile, text, { mode: 0o600 });
};

(async () => {
  const config = loadConfig();
  const { clientId, clientSecret } = config.youtube;
  if (!clientId || !clientSecret) {
    console.error(
      `Put YOUTUBE_CLIENT_ID and YOUTUBE_CLIENT_SECRET in ${config.envFile} first (see stream.env.example).`
    );
    process.exit(1);
  }

  const server = http.createServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const redirect = `http://127.0.0.1:${server.address().port}/`;
  const state = crypto.randomBytes(16).toString('hex');
  const url = `https://accounts.google.com/o/oauth2/v2/auth?${new URLSearchParams(
    {
      client_id: clientId,
      redirect_uri: redirect,
      response_type: 'code',
      scope: SCOPE,
      access_type: 'offline',
      prompt: 'consent',
      state,
    }
  )}`;
  console.log(
    'Sign in with the Google account that owns the channel. If the browser does not open, visit:\n' +
      url
  );
  execFile('open', [url], () => {});

  const code = await waitForCode(server, redirect, state);
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirect,
      grant_type: 'authorization_code',
    }).toString(),
  });
  const body = await res.json();
  if (!body.refresh_token) {
    console.error(
      `Google did not return a refresh token (${body.error_description || body.error || res.status}).`
    );
    process.exit(1);
  }
  saveRefreshToken(config.envFile, body.refresh_token);
  console.log(
    `Saved the refresh token to ${config.envFile}. Now run: make services-restart`
  );
})().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
