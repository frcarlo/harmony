# HArmony Logo — Web App Assets

## Inhalt

```
output/
├── _preview.png                    Visuelle Übersicht aller Varianten
├── favicon.ico                     Multi-Size Favicon (16/32/48 px) — dark Variante
├── favicon-light.ico               dito — light Variante
├── original-ai-tile-1180.png       Original KI-generiertes Logo (für Splash/Marketing)
│
├── dark/
│   ├── icon/                       Icon-Mark (nur Häuser, kein Text)
│   │   ├── icon-16.png             Favicon
│   │   ├── icon-32.png             Favicon
│   │   ├── icon-48.png             Favicon, ältere Browser
│   │   ├── icon-64.png
│   │   ├── icon-96.png
│   │   ├── icon-128.png
│   │   ├── icon-180.png            Apple Touch Icon
│   │   ├── icon-192.png            PWA / Android Home-Screen
│   │   ├── icon-256.png
│   │   └── icon-512.png            PWA Splash, App Stores
│   └── logo/                       Voll-Logo mit "HArmony" Wortmarke
│       ├── logo-256.png
│       ├── logo-384.png
│       ├── logo-512.png
│       └── logo-1024.png
│
└── light/                          Identische Struktur — heller Tile, dunkler Text
    ├── icon/...
    └── logo/...
```

## Wann welche Variante?

**Dark** — dunkles Tile, weiße Schrift. Nutze ich, wenn dein App-UI hell ist (Standard-Light-Theme), damit das Logo als kompakte dunkle Kachel hervorsticht.

**Light** — helles Tile, dunkle Schrift. Nutze ich, wenn dein App-UI dunkel ist (Dark-Theme), damit das Logo nicht als schwarzer Klecks auf schwarzem Hintergrund verschwindet.

**Icon-Mark vs. Voll-Logo** — Unter ~150 px ist die "HArmony"-Schrift unleserlich. Daher:
- Icons (16–512 px): nur die zwei Häuser → kompakt, gut bei jeder Größe
- Logos (256–1024 px): mit Wortmarke → für Splash-Screens, Header, Marketing

## Einbindung in HTML

```html
<head>
  <!-- Standard Favicon -->
  <link rel="icon" type="image/x-icon" href="/favicon.ico">

  <!-- Hochauflösende PNG Favicons -->
  <link rel="icon" type="image/png" sizes="32x32" href="/dark/icon/icon-32.png">
  <link rel="icon" type="image/png" sizes="16x16" href="/dark/icon/icon-16.png">

  <!-- Apple Touch Icon (iOS Home-Screen) -->
  <link rel="apple-touch-icon" sizes="180x180" href="/dark/icon/icon-180.png">

  <!-- PWA Manifest -->
  <link rel="manifest" href="/manifest.webmanifest">

  <!-- Theme-abhängiges Favicon (modern browsers) -->
  <link rel="icon" href="/dark/icon/icon-32.png" media="(prefers-color-scheme: light)">
  <link rel="icon" href="/light/icon/icon-32.png" media="(prefers-color-scheme: dark)">
</head>
```

## PWA `manifest.webmanifest`

```json
{
  "name": "HArmony",
  "short_name": "HArmony",
  "icons": [
    { "src": "/dark/icon/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/dark/icon/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/dark/icon/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any maskable" }
  ],
  "theme_color": "#1a2535",
  "background_color": "#1a2535",
  "display": "standalone"
}
```

## Theme-abhängiges Logo im UI (CSS)

```html
<picture>
  <source srcset="/light/logo/logo-512.png" media="(prefers-color-scheme: dark)">
  <img src="/dark/logo/logo-512.png" alt="HArmony" width="256">
</picture>
```

## Markenfarben

| Element       | Hex        | Verwendung                |
|---------------|-----------|---------------------------|
| Blau (Haus H) | `#1AA9E5` | Akzent kalt               |
| Gelb (Haus A) | `#F5B921` | Akzent warm               |
| Tile dark     | `#1A2535` | Dark-UI Hintergrund       |
| Tile light    | `#FFFFFF` → `#ECF0F7` (Verlauf) | Light-UI Hintergrund |
| Text dark     | `#141E32` | Schrift auf hellem Tile   |

## Logo neu erzeugen

Falls du eine andere Größe oder Variante brauchst, ist der Generator mit dabei
(`logo_gen.py`). Nutzung:

```python
from logo_gen import render_logo
img = render_logo(size=256, theme="dark", show_text=True)
img.save("mein-logo.png")
```
