# Experient CLT Hub

Team calendar + workspace for the Charlotte office at Camp North End.

## Deploy to GitHub Pages (5 minutes)

### 1. Create the repo
1. Go to [github.com/new](https://github.com/new)
2. Name it `experient-hub` (or anything you like)
3. Set to **Public** (required for free GitHub Pages)
4. Click **Create repository**

### 2. Upload the files
On the repo page, click **uploading an existing file** and drag in all files from this folder:
- `index.html`
- `style.css`
- `stars.js`
- `calendar.js`
- `workspace.js`
- `app.js`
- `README.md`

Click **Commit changes**.

### 3. Enable GitHub Pages
1. Go to **Settings → Pages**
2. Under **Source**, select **Deploy from a branch**
3. Branch: `main`, folder: `/ (root)`
4. Click **Save**

Your site will be live at:
`https://<your-github-username>.github.io/experient-hub/`

(Takes ~60 seconds the first time.)

---

## Connect Google Calendar

Once the site is live:

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create a new project (or use an existing one)
3. Enable the **Google Calendar API** (APIs & Services → Library)
4. Go to **APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client ID**
5. Application type: **Web application**
6. Add your GitHub Pages URL as an **Authorized JavaScript origin**:
   `https://<your-username>.github.io`
7. Copy the **Client ID**

In the Hub app:
- Click **⟳ Connect Google**
- Paste the Client ID
- Add your calendar IDs and assign each a category
- Click **Save & Authorize** — a Google sign-in popup will appear

Calendar IDs to find: Google Calendar → Settings → click a calendar → scroll to "Calendar ID"

---

## Local testing

Just open `index.html` in a browser. Google OAuth won't work locally unless you add `http://localhost` or the file's origin to your Google Cloud authorized origins.

For local dev with a server:
```bash
npx serve .
# or
python3 -m http.server 8080
```
Then add `http://localhost:8080` as an authorized origin in Google Cloud.
