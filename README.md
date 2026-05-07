# Fluxframe Portfolio

Static dark-mode portfolio site for Fluxframe.

## Files

- `index.html`: homepage with hero, about/KPI block, crypto startup work, web design work, and all-projects CTA.
- `projects.html`: full filtered project gallery.
- `web-designs.html`: web design gallery plus future website slots.
- `crypto-startups.html`: grouped Hype Bears, GM.CO/PXN, and PSSD startup work.
- `archive.html`: legacy all-graphics gallery.
- `portfolio-data.js`: all project metadata and future website slots.
- `assets/portfolio/`: deduped portfolio media.
- `assets/portfolio/DEDUPED_ASSETS.md`: curation notes and copied asset list.

## Add A Website Later

Add a new entry to `window.FLUXFRAME_ITEMS` in `portfolio-data.js`, copy the image into `assets/portfolio/`, and set:

```js
category: "web",
kind: "Web Design",
webCase: true
```

The LinkedIn URL is set in `window.FLUXFRAME_SITE.linkedin`.
