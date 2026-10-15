# Run btc-dash.com on Oracle Cloud (Always Free)

One small ARM server runs the dashboard behind Caddy (automatic HTTPS). The same box will later run the YouTube stream.

**Cost:** $0 on Oracle's Always Free tier (Ampere A1: 2 OCPU, 12 GB RAM, 10 TB/month outbound, as of 2026).

## 1. Create the server (Oracle console, ~15 min)

1. Sign up at <https://signup.cloud.oracle.com>. **Pick the home region carefully**: Always Free Ampere servers only exist there and it can't be changed later.
2. **Compute → Instances → Create instance**
   - **Image:** Canonical Ubuntu 24.04
   - **Shape:** Ampere → `VM.Standard.A1.Flex`, **2 OCPU, 12 GB**
   - **Networking:** create a new VCN with a public subnet, *Assign a public IPv4 address* on
   - **SSH keys:** upload your public key (e.g. `~/.ssh/id_ed25519.pub`)
   - If you get *Out of capacity*, try another availability domain or retry later; it's common in busy regions.
3. **Open ports 80 and 443:** instance page → subnet → *Default Security List* → **Add Ingress Rules** → Source CIDR `0.0.0.0/0`, IP protocol TCP, destination port `80`; repeat for `443`.
   (The server's own firewall is handled by `setup.sh`.)
4. *(Recommended)* **Make the IP permanent:** *Networking → IP Management → Reserved Public IPs*, reserve one and attach it to the instance, so the address (and your DNS) never changes after a stop/start.

> **Idle reclamation:** Oracle may reclaim Always Free servers that stay under 20% CPU, network and memory for 7 days. The website alone is that light, so either start the YouTube stream soon after (it keeps the CPU busy) or upgrade the account to *Pay As You Go*. That upgrade is still free within the Always Free limits, and is reported to stop reclamation.

## 2. Install the app (one command)

The server pulls the code from GitHub, so **push to `main` first**. From the repo on your machine:

```bash
deploy/oracle/deploy.sh ubuntu@<server-ip>
```

Or on the server itself:

```bash
curl -fsSL https://raw.githubusercontent.com/mathiasbc/liberator-stream/main/deploy/oracle/setup.sh | sudo bash
```

It installs Node 22, Caddy and the firewall rules, builds the frontend, starts the `liberator-stream` service, and checks it's healthy. Re-running it is how you update.

**Check it before switching DNS:**

```bash
ssh -L 3001:localhost:3001 ubuntu@<server-ip>
```

Then open <http://localhost:3001> on your machine.

## 3. Point btc-dash.com at the server (GoDaddy)

*GoDaddy → My Products → btc-dash.com → DNS*:

| Type | Name | Value | TTL |
|------|------|-------|-----|
| A | `@` | `<server-ip>` (replaces Render's `216.24.57.1`) | 600 |
| CNAME | `www` | `@` (replaces `liberator-bitcoin-dashboard.onrender.com`) | 600 |

Caddy requests the HTTPS certificates on its own as soon as DNS points at the server, usually within minutes. Watch it with `sudo journalctl -u caddy -f`.

Once btc-dash.com loads from Oracle, remove the custom domain in Render's dashboard. Keep the Render service as a fallback, or suspend it.

## Everyday operations

| Task | Command (on the server) |
|------|-------------------------|
| Deploy latest `main` | `deploy/oracle/deploy.sh ubuntu@<ip>` (from your machine) |
| App logs | `sudo journalctl -u liberator-stream -f` |
| Restart app | `sudo systemctl restart liberator-stream` |
| Settings (e.g. `COINGECKO_API_KEY`) | `sudo nano /etc/liberator-stream.env`, then restart |
| Health | `curl -s localhost:3001/api/stats` |

The previous frontend build is kept in `frontend/build.prev`. A failed build never replaces the live site.
