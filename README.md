# TG Feed — Multi-channel Telegram Reader

A self-hosted, zero-auth, free Telegram feed reader. Displays posts from multiple public Telegram channels side by side.

## How it works

```
Browser → /api/channel?channel=topor
           ↓ Vercel serverless function
           ↓ fetches t.me/s/topor (Telegram's public preview page)
           ↓ parses latest post IDs from HTML
           ↓ returns JSON { postIds: [49252, 49251, ...] }
Browser → renders each post via Telegram's official embed widget
```

No Telegram API key needed. No user accounts. No database.

---

## Deploy in 5 minutes

### 1. Get the code on GitHub
```bash
git clone <this-repo>
cd tgfeed
git init
git add .
git commit -m "init"
# push to a new GitHub repo
```

### 2. Deploy to Vercel
1. Go to [vercel.com](https://vercel.com) → New Project → Import your GitHub repo
2. Framework: **Other** (not Next.js)
3. Root directory: leave as-is
4. Click **Deploy**

That's it. The app is live. No environment variables needed for the basic version.

### 3. (Optional) Enable AI Summaries
1. Go to [aistudio.google.com](https://aistudio.google.com) → Sign in with Google → Get API key
2. In Vercel dashboard → your project → Settings → Environment Variables
3. Add: `GEMINI_API_KEY` = your key
4. Redeploy (Vercel → Deployments → Redeploy)

Now the **✦ AI** button in each column will generate a summary of recent posts using Gemini 2.0 Flash (free tier).

---

## Project structure

```
tgfeed/
├── api/
│   ├── channel.js      # Proxy: fetches t.me/s/ → returns post IDs as JSON
│   └── summarize.js    # AI: sends post texts to Gemini → returns summary
├── public/
│   └── index.html      # The entire frontend (one file)
├── vercel.json         # Vercel config (CORS headers, function timeouts)
└── package.json
```

---

## Adding channels

In the UI: click **+ Channel**, enter the username (e.g. `topor`), click Add.

To change the defaults, edit `public/index.html`:
```js
const DEFAULT_CHANNELS = [
  { channel: 'topor',    label: 'Топор' },
  { channel: 'cybers',   label: 'КиберТопор' },
  { channel: 'ecotopor', label: 'ЭкоТопор' },
];
```

---

## Limitations

- Only works with **public** Telegram channels
- Post IDs are discovered by scraping `t.me/s/<channel>` — Telegram may occasionally change this HTML structure
- Telegram embeds load slowly (this is Telegram's own widget, not us)
- Vercel free tier: 100GB bandwidth/month, 100k serverless function invocations/month — more than enough for personal/small use

---

## Future ideas

- Auto-refresh every N minutes (add `setInterval` in frontend)
- Save column layout to `localStorage`
- Dark/light mode toggle
- Full-text post search via the text snippets API returns
- Supabase for saved layouts across devices (if needed later)
