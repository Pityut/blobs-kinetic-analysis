# Blob Kinetics Web App

A browser-based analysis dashboard for computing **dI/dt kinetics** of individual fluorescent blobs tracked across time-lapse microscopy frames. Upload `.xlsx` data files, tune pipeline parameters, and get interactive charts and an exportable Excel summary — no server or Python required.

---

## What it does

1. **Upload** — drag-and-drop one or more `.xlsx` files (one file per field-of-view). Filenames are parsed automatically to extract condition (`WT`/`KO`) and replicate number.
2. **Configure** — adjust pipeline parameters via sliders in the sidebar.
3. **Run** — the full analysis pipeline executes client-side in the browser.
4. **Explore** — interactive charts: intensity over time, dI/dt distributions, brightening/dimming/stable fractions, per-track summaries, and a QC attrition table.
5. **Export** — download all results as a multi-sheet `.xlsx` file.

---

## Input format

Each input file must be a single-sheet `.xlsx` with these columns:

| Column             | Type  | Description                        |
|--------------------|-------|------------------------------------|
| `frame_index_kept` | int   | Sequential frame number            |
| `x`                | float | Blob center X coordinate (px)      |
| `y`                | float | Blob center Y coordinate (px)      |
| `radius`           | float | Blob radius (px)                   |
| `mean_r`           | float | Mean red-channel intensity of blob |

Each row is one detected blob in one frame.

Filename convention (auto-parsed): `{genotype} replicate {N} field {M}.xlsx`

---

## Pipeline

The pipeline runs entirely in JavaScript inside `src/utils/pipeline/`:

| Stage | Module | Description |
|---|---|---|
| Isolation filtering | `isolation.js` | Flags blobs with `nn_distance >= min_nn_distance` as isolated |
| Blob tracking | `tracking.js` | Greedy nearest-neighbor linking across consecutive frames |
| Track selection | `tracking.js` | Keeps only strictly continuous tracks with ≥ N frames |
| Kinetics | `kinetics.js` | Computes `dI/dt` per interval; classifies brightening / dimming / stable |
| Summaries | `summaries.js` | Track-level, timepoint, direction, and QC attrition tables |

---

## Pipeline parameters

| Parameter | Default | Description |
|---|---|---|
| `min_nn_distance` | 15.0 px | Minimum distance to nearest neighbor to be considered isolated |
| `max_link_distance` | 10.0 px | Maximum displacement to link a blob between frames |
| `frame_interval_min` | 30 min | Time between frames (used for dI/dt units: intensity/hr) |
| `min_consecutive_frames` | 2 | Minimum track length to include in analysis |
| `stable_eps` | 1e-6 | dI/dt threshold below which an interval is classified as stable |

---

## Getting started

```bash
cd web-app
npm install
npm run dev        # starts the dev server at http://localhost:3000 with hot reload
```

Open [http://localhost:3000](http://localhost:3000).

```bash
npm run build   # production build
npm run lint    # lint
```

---

## Project structure

```
src/
├── app/
│   ├── page.js          # Root page — orchestrates state, run, export
│   ├── layout.js
│   └── globals.css
├── components/
│   ├── Sidebar.js       # File upload + parameter controls
│   ├── Dashboard.js     # All charts and tables
│   ├── Table.js         # Reusable sortable table
│   ├── ThemeToggle.js   # Light / dark mode toggle
│   └── ErrorBoundary.js
├── hooks/
│   └── useResults.js    # Derived data / aggregations from pipeline output
└── utils/
    ├── exportChart.js   # PNG export for chart panels
    └── pipeline/
        ├── index.js     # runPipeline() entry point
        ├── config.js    # DEFAULT_CONFIG
        ├── isolation.js
        ├── tracking.js
        ├── kinetics.js
        ├── summaries.js
        └── helpers.js
```

---

## Tech stack

- [Next.js 16](https://nextjs.org) (App Router)
- [React 19](https://react.dev)
- [Recharts](https://recharts.org) — charts
- [SheetJS (xlsx)](https://sheetjs.com) — Excel read/write
- [Lucide React](https://lucide.dev) — icons
