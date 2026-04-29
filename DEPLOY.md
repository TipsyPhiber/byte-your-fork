# Deploying ByteYourFork to production

A step-by-step checklist to take this app from your laptop to `https://byteyourfork.com`.

---

## 0. What you'll need before you start

- The domain `byteyourfork.com` (registered, with access to its DNS panel)
- A credit card for a VPS provider (~$6–12/month)
- Your local repo pushed to GitHub (or some git remote you can clone from the server)
- An SSH client (already on your machine — just `ssh`)

---

## 1. Rotate your secrets

The current `backend/.env` contains development secrets that have been exposed in chat logs. **Do not reuse them in production.**

On your laptop, generate fresh values:

```sh
openssl rand -hex 64   # use for JWT_SECRET
openssl rand -hex 32   # use for AES_KEY
openssl rand -base64 24 # use for DB_PASSWORD
```

Save these somewhere safe (a password manager). You'll paste them into the production `.env` in step 6.

> ⚠️ If you change `AES_KEY` after data has been encrypted with the old one, that data becomes unreadable. Since this is a fresh deployment, you're fine — just don't change it again later.

---

## 2. Get a VPS

Pick one provider and create the smallest Ubuntu 22.04 LTS instance they offer:

- **DigitalOcean** — "Droplet", $6/mo basic
- **Hetzner** — CX22, ~€4/mo (cheapest, EU-based)
- **Linode** — Nanode 1GB, $5/mo
- **AWS Lightsail** — $5/mo

Add your SSH public key during creation so you can log in without a password.

Once it's up, note the **public IPv4 address**. SSH in:

```sh
ssh root@<your-server-ip>
```

---

## 3. Point DNS at the server

In your domain registrar's DNS panel (Namecheap, Cloudflare, GoDaddy, etc.), create two **A records**:

| Type | Host | Value | TTL |
|------|------|-------|-----|
| A | `@`  | `<your-server-ip>` | 300 |
| A | `www` | `<your-server-ip>` | 300 |

Wait 1–5 minutes, then verify from your laptop:

```sh
dig byteyourfork.com +short
dig www.byteyourfork.com +short
```

Both should print your server's IP. Don't proceed until they do — Let's Encrypt will fail otherwise.

---

## 4. Set up the server

SSH in as root and run:

```sh
# Create a non-root user (replace 'bruce' with whatever you want)
adduser bruce
usermod -aG sudo bruce
rsync --archive --chown=bruce:bruce ~/.ssh /home/bruce
# Log out and back in as the new user from now on
```

```sh
ssh bruce@<your-server-ip>
```

Install dependencies:

```sh
sudo apt update && sudo apt upgrade -y
sudo apt install -y docker.io docker-compose-plugin nginx certbot python3-certbot-nginx git ufw
sudo usermod -aG docker $USER
# Log out and back in so the docker group takes effect
exit
```

Re-SSH, then set up the firewall:

```sh
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

---

## 5. Clone the repo onto the server

```sh
sudo mkdir -p /opt/byteyourfork
sudo chown $USER:$USER /opt/byteyourfork
git clone <your-repo-url> /opt/byteyourfork
cd /opt/byteyourfork
```

---

## 6. Create the production `.env`

Do **not** copy your laptop's `.env` over — it has dev secrets and the wrong URLs.

```sh
nano backend/.env
```

Paste this template, filling in the values you generated in step 1:

```
# --- Postgres ---
DB_HOST=postgres
DB_PORT=5432
DB_NAME=byte_your_fork
DB_USER=postgres
DB_PASSWORD=<the strong password from step 1>

# --- Auth & crypto ---
JWT_SECRET=<the 128-char hex from step 1>
AES_KEY=<the 64-char hex from step 1>

# --- URLs ---
PORT=5000
FRONTEND_URL=https://byteyourfork.com
APP_URL=https://byteyourfork.com

# --- SMTP (fill in if you want email features) ---
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM=

# --- Instacart (optional) ---
INSTACART_API_BASE=
INSTACART_API_KEY=
```

Save and exit (`Ctrl+O`, `Enter`, `Ctrl+X`).

Lock the file down so only you can read it:

```sh
chmod 600 backend/.env
```

---

## 7. Configure nginx + TLS

Copy the repo's nginx config into nginx's sites directory:

```sh
sudo cp nginx.conf /etc/nginx/sites-available/byteyourfork
sudo ln -s /etc/nginx/sites-available/byteyourfork /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
```

Get TLS certificates from Let's Encrypt:

```sh
sudo certbot --nginx -d byteyourfork.com -d www.byteyourfork.com
```

Follow the prompts (enter your email, agree to ToS). Certbot will edit the nginx config to wire up the certs and reload nginx.

Verify:

```sh
sudo nginx -t
sudo systemctl reload nginx
```

Auto-renewal is already enabled via a systemd timer. Confirm:

```sh
systemctl list-timers | grep certbot
```

---

## 8. Start the stack

```sh
cd /opt/byteyourfork
IMAGE_REPO=byteyourfork docker compose up -d --build
```

First build will take a few minutes. Watch the logs:

```sh
docker compose logs -f
```

Press `Ctrl+C` to detach (containers keep running).

Visit **https://byteyourfork.com** — you should see the app.

---

## 9. Smoke test

- [ ] Homepage loads over HTTPS
- [ ] `http://byteyourfork.com` redirects to `https://`
- [ ] Sign up for a new account
- [ ] Log in
- [ ] Any feature that hits the API works (recipes load, etc.)
- [ ] Check `docker compose logs backend` for errors

---

## 10. Things to do soon (not blockers, but important)

### Database backups
Nothing is backed up right now. At minimum, add a daily `pg_dump`:

```sh
sudo crontab -e
```

Add:
```
0 3 * * * docker exec byteyourfork-postgres pg_dump -U postgres byte_your_fork | gzip > /opt/backups/byf-$(date +\%F).sql.gz
```

Then `sudo mkdir -p /opt/backups`. Better: also copy these off-server (S3, Backblaze B2, etc.).

### Auto-update on git push
For now you redeploy by SSHing in and running:
```sh
cd /opt/byteyourfork && git pull && docker compose up -d --build
```
Later you can wire up GitHub Actions to do this automatically.

### Monitoring
You'll have no idea if the site goes down. Set up a free uptime check at [UptimeRobot](https://uptimerobot.com) or [Better Stack](https://betterstack.com) pinging `https://byteyourfork.com`.

### Rate limiting
The backend doesn't rate-limit auth endpoints. Worth adding `express-rate-limit` to `/api/auth/*` before the site gets any traffic.

---

## Common problems

**`certbot` fails with "DNS problem"** — DNS hasn't propagated yet. Wait 5 more minutes and retry.

**Site shows nginx default page** — you forgot to `rm /etc/nginx/sites-enabled/default`.

**`502 Bad Gateway`** — backend container isn't running or crashed. Check `docker compose logs backend`.

**Frontend loads but API calls fail** — `FRONTEND_URL` / `APP_URL` in `.env` are wrong, or you forgot to rebuild after editing `.env` (`docker compose up -d --build`).

**"permission denied" on `docker` commands** — you didn't log out and back in after `usermod -aG docker`.

---

## Redeploying changes later

```sh
ssh bruce@<your-server-ip>
cd /opt/byteyourfork
git pull
docker compose up -d --build
```

That's it.
