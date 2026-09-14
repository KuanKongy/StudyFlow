# OG image

`frontend/public/og-image.png` (1200×630) is rendered from `docs/og-image.html`.

To regenerate after editing the HTML (macOS, from the repo root):

```sh
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --headless --disable-gpu --hide-scrollbars \
  --force-device-scale-factor=2 --window-size=1200,630 \
  --virtual-time-budget=10000 --screenshot=og-2x.png \
  "file://$PWD/docs/og-image.html"
sips -z 630 1200 og-2x.png --out frontend/public/og-image.png
rm og-2x.png
```

The image is rendered at 2× and downscaled for crisp text. The meta tags that
reference it live in `frontend/index.html`; the `og:image` URL is root-relative,
so prefix it with the production origin once the app has a public domain —
most crawlers ignore relative image URLs.
