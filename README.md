# MagangHub Filter

**MagangHub's built-in filters are slow and painful to use.** This project scrapes the public internship listings from [MagangHub Kemnaker](https://maganghub.kemnaker.go.id) and serves them in a static dashboard where you can search, filter, sort, and explore on a map — instantly, in your browser.

No backend. No waiting on server round-trips. Just open the app and filter what you want, faster.

Feel free to use, fork, or deploy this however you like.

## Quick start

You only need Node.js. Python is **not** required to run the dashboard.

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

Production build:

```bash
npm run build
npm run preview
```

Static files land in `dist/` — deploy that folder to Netlify, Vercel, GitHub Pages, or any static host.

## What's included

- **~28k internship listings** pre-loaded in `public/data/`
- **Instant client-side filtering** — search, multi-select filters, date/quota ranges, sorting, pagination
- **Map view** — company markers grouped by location, click to see open positions
- **Stats panel** — top companies, locations, education levels, and more
- **Bookmarks** — saved in your browser (`localStorage`), no account needed
- **Company logos** — cached locally under `public/logos/`

## Project layout

```
magang-hub-filter/
├── src/                 # React dashboard (Vite + TypeScript)
├── public/
│   ├── data/            # Static JSON (listings + filter metadata)
│   └── logos/           # Cached company logos
├── scrape/              # Optional Python tooling to refresh data
│   ├── scrape.py        # Scraper
│   ├── generate_static_data.py
│   ├── download_logos.py
│   ├── output/          # Raw scrape output
│   └── .venv/           # Python virtualenv (scrape only)
├── package.json
└── vite.config.ts
```

## Refreshing the data (optional)

If you want to re-scrape or update listings, use the Python tools in `scrape/`:

```bash
cd scrape
python3 -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt

# 1. Scrape latest listings
python -m scrape.scrape

# 2. Download company logos (optional)
python -m scrape.download_logos

# 3. Regenerate static JSON for the frontend
python -m scrape.generate_static_data
```

Then restart `npm run dev` to pick up the new files in `public/data/`.

## Why static?

MagangHub's site re-filters on every interaction through their backend. With ~28k records, that gets slow fast.

This dashboard loads the dataset once, then runs all filtering, stats, and map aggregation in the browser. Same data, much snappier experience.

## Disclaimer

This is an unofficial tool. Data comes from MagangHub's public listing pages. Always verify details and apply through the official MagangHub site linked in each listing.

## License

Use it however you want. No warranty, no affiliation with Kemnaker or MagangHub.
# magang-hub-filter
