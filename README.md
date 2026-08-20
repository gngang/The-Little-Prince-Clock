# Life Clock

A quiet, celestial "life clock" widget for a five-year-planning night. It puts the present moment into perspective by showing progress through the current minute, hour, day, week, month, year, and (if you add a birthday) your life — plus a five-year outlook, rotating reflection prompts, and a small "constellation" of goals.

No backend, no build step, no dependencies beyond two Google Fonts. Just three files: `index.html`, `style.css`, `script.js`.

## Run it locally

Because the page reads `localStorage` and uses ES features that some browsers restrict under `file://`, serve it instead of double-clicking it:

```bash
cd life-clock
python3 -m http.server 8080
# then open http://localhost:8080
```

Any static server works (`npx serve`, VS Code's Live Server, etc.).

## Deploy it

**Vercel**
```bash
npm i -g vercel
cd life-clock
vercel --prod
```
No config needed — it's picked up as a static site.

**Netlify** — drag the `life-clock` folder into the Netlify dashboard, or:
```bash
npm i -g netlify-cli
netlify deploy --prod --dir .
```

**GitHub Pages** — push the folder to a repo, then enable Pages on the branch/root in repo Settings → Pages.

**Cloudflare Pages** — connect the repo, or drag-and-drop the folder in the dashboard. Build command: none. Output directory: `/`.

## Embed it in Notion

1. Deploy the site (above) and copy its URL.
2. In Notion, type `/embed` and paste the URL.
3. Resize the embed block to roughly 700–1000px wide — the layout is fluid and reflows down to mobile widths automatically.
4. Optional: give each person a personalized link (see below) before embedding, or let each person open the shared link once and fill in Settings — it's saved locally in their browser either way.

## Personalizing a link

The widget reads these URL query params on load and pre-fills settings:

```
?birthday=2006-07-04&lifespan=90&name=Gabby&planYear=2026
```

- `birthday` — `YYYY-MM-DD`
- `lifespan` — target lifespan in years (default `90`)
- `name` — optional display name
- `planYear` — optional five-year-plan start year

Use the **Copy shareable link** button in Settings to generate one from whatever's currently filled in.

If no birthday is set (first visit, no param), Settings opens automatically and the life-dependent parts of the widget (the outer ring, "Year of your life," remaining time) show a prompt instead of numbers — everything else (minute/hour/day/week/month/year rings) works immediately since it needs no personal data.

## Customizing colors

All colors are CSS custom properties at the top of `style.css`:

```css
:root{
  --cream: #F6EFDF;
  --paper: #FBF7EC;
  --ink: #3B342C;
  --navy: #303B52;
  --gold: #B4922F;
  --gold-soft: #E3C77E;
  --dusty-blue: #7C93A8;
  --rose: #D9A6A0;
  --brown: #8B6F56;
}
```

The seven ring colors (minute → life) are set separately in `script.js` in the `RING_DEFS` array, since SVG `stroke` attributes don't inherit CSS variables reliably across all embed contexts:

```js
const RING_DEFS = [
  { key: "minute", label: "Minute", color: "#E3C77E" },
  ...
];
```

## Customizing reflection prompts

Edit the `REFLECTIONS` array near the top of `script.js`. Prompts rotate every 15 seconds with a soft fade (or swap instantly, with no fade, if the visitor's OS has "reduce motion" turned on).

## Customizing daily-perspective questions

Edit the `DAILY_CARDS` array in `script.js` — each entry has a `title` and a `question`.

## Data & privacy

Everything (settings, goals) is stored only in the visitor's own browser via `localStorage`. Nothing is sent anywhere. Clearing site data in the browser resets the widget.

## Focus Mode

The "Focus mode" toggle in the header hides everything except the ring visualization, one reflection prompt, and today's card ("What would make today feel well spent?") — meant for leaving the widget pinned at the top of a Notion dashboard without it dominating the page. The toggle state is remembered per-browser.

## Accessibility notes

- All interactive controls are keyboard-reachable; the settings panel and goal dialog use native `<dialog>`/focus-visible outlines.
- Respects `prefers-reduced-motion`: star twinkle, shooting star, and reflection fade are disabled; ring updates become instant.
- The SVG clock has a `<title>`/`<desc>` for screen readers; per-ring values are also available as plain text in the legend beneath it.
