# HArmony

[![Version](https://img.shields.io/badge/version-v1.0.3-blue)](https://github.com/frcarlo/harmony/releases)
[![Docker](https://img.shields.io/badge/docker-ghcr.io%2Ffrcarlo%2Fharmony-2496ED?logo=docker&logoColor=white)](https://github.com/frcarlo/harmony/pkgs/container/harmony)

**HArmony** is a self-hosted, customizable dashboard builder for [Home Assistant](https://www.home-assistant.io/). Build pixel-perfect smart home dashboards with a drag-and-drop editor, real-time entity state sync, multi-user access control, and a polished Material Design UI.

---

## Features

- **Drag-and-drop editor** — Build and rearrange dashboards with GridStack
- **19+ widget types** — Sensors, lights, switches, cameras, media players, covers, thermostats, weather, charts, clocks, calendars, person presence, energy flow, and more
- **Real-time sync** — WebSocket connection to Home Assistant for live state updates
- **Multi-user** — Role-based access control (admin / user), per-user dashboard visibility
- **Notification rules** — Trigger alerts or camera snapshots based on entity state changes, with cooldown and history log
- **Audit log** — Track all administrative actions
- **21 themes** — Dark, Light, Dracula, Nord, Catppuccin, Aura Dark, Anthropic, Matrix, and many more
- **Glass effect** — Animated backdrop blur UI (toggleable)
- **PWA** — Installable as a native app on mobile and desktop
- **Internationalization** — German, English, Spanish, French, Italian, Dutch
- **Keycloak SSO** — Optional OAuth2 integration
- **Docker-ready** — Single container with SQLite persistence

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | [Nuxt 3](https://nuxt.com/) (Vue 3, SSR disabled) |
| UI | [Vuetify 3](https://vuetifyjs.com/) + Material Design Icons |
| State | [Pinia](https://pinia.vuejs.org/) |
| Grid | [GridStack](https://gridstackjs.com/) |
| Charts | [Apache ECharts](https://echarts.apache.org/) |
| Database | SQLite (Node 22 native) |
| Auth | nuxt-auth-utils + bcrypt, optional Keycloak |
| i18n | @nuxtjs/i18n |
| PWA | @vite-pwa/nuxt |

---

## Widget Types

| Widget | Description |
|---|---|
| `sensor` | Numeric/string value with optional threshold alerts |
| `switch` | On/off toggle |
| `light` | Brightness & color control |
| `chart` | Historical state graph (1h – 30d) |
| `camera` | Live snapshot with auto-refresh |
| `thermostat` | Temperature display and HVAC control |
| `media_player` | Playback controls with album art |
| `cover` | Blind/shutter with position dial |
| `lock` | Lock/unlock with optional confirmation |
| `weather` | Current conditions and multi-day forecast |
| `clock` | Analog or digital, any timezone |
| `label` | Static text / heading |
| `room_card` | Room summary (climate, lights, sensors) |
| `calendar` | Upcoming events from HA calendar entities |
| `person` | Presence status and location |
| `energy` | Grid import/export, solar, battery flow |

---

## Prerequisites

- **Node.js 22+** (native SQLite support required)
- A running **Home Assistant** instance
- A **Long-Lived Access Token** from Home Assistant

---

## Installation

### Docker (recommended)

A pre-built image is available from the GitHub Container Registry:

```bash
docker pull ghcr.io/frcarlo/harmony:latest
```

```yaml
# compose.yml
services:
  harmony:
    image: ghcr.io/frcarlo/harmony:latest   # or a specific version, e.g. :1.0.0
    restart: on-failure:3
    environment:
      HA_URL: http://homeassistant.local:8123
      HA_TOKEN: your_long_lived_access_token
      DATA_DIR: /app/data
      NUXT_SESSION_PASSWORD: a_random_64_char_hex_string
      # Optional Keycloak SSO:
      # KEYCLOAK_ISSUER: https://auth.example.com/realms/myrealm
      # KEYCLOAK_CLIENT_ID: harmony
      # KEYCLOAK_CLIENT_SECRET: your_secret
    volumes:
      - harmony_data:/app/data
    ports:
      - "3000:3000"

volumes:
  harmony_data:
```

```bash
docker compose up -d
```

### Local Development

```bash
cd nuxt
cp .env.example .env   # fill in HA_URL, HA_TOKEN, NUXT_SESSION_PASSWORD
npm install
npm run dev            # http://localhost:3000
```

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `HA_URL` | ✅ | Home Assistant base URL, e.g. `http://192.168.1.10:8123` |
| `HA_TOKEN` | ✅ | Long-lived access token from HA profile |
| `NUXT_SESSION_PASSWORD` | ✅ | At least 32-char secret for session encryption |
| `DATA_DIR` | | Path for SQLite database (default: `./data`) |
| `KEYCLOAK_ISSUER` | | Keycloak realm URL — enables SSO login tab |
| `KEYCLOAK_CLIENT_ID` | | Keycloak client ID |
| `KEYCLOAK_CLIENT_SECRET` | | Keycloak client secret |

---

## First Run

1. Open `http://localhost:3000` — you will be redirected to `/setup`
2. Create the first admin account
3. Connect your Home Assistant entities and start building dashboards

---

## Roles & Permissions

| Capability | Admin | User |
|---|---|---|
| View assigned dashboards | ✅ | ✅ |
| Enable/disable notification rules | ✅ | ✅ |
| View notification log | ✅ | ✅ |
| Edit & create dashboards | ✅ | ❌ |
| Manage users | ✅ | ❌ |
| Configure notification rules | ✅ | ❌ |
| View audit log | ✅ | ❌ |
| Assign dashboard access per user | ✅ | ❌ |

---

## API Overview

| Endpoint | Description |
|---|---|
| `GET /api/dashboards` | List accessible dashboards |
| `POST /api/dashboards` | Create dashboard |
| `PUT /api/dashboards/[id]` | Save dashboard & widgets |
| `DELETE /api/dashboards/[id]` | Delete dashboard |
| `GET /api/notification-rules` | List notification rules |
| `GET /api/notification-log` | Notification history |
| `GET /api/users` | List users (admin) |
| `GET /api/audit-log` | Audit trail (admin) |
| `POST /api/auth/login` | Local login |
| `POST /api/auth/logout` | Logout |
| `GET /api/auth/keycloak` | Keycloak OAuth redirect |
| `GET /api/ha/history` | Entity state history from HA |
| `GET /api/camera/[entityId]` | Camera snapshot proxy |

---

## Database

SQLite database stored at `DATA_DIR/harmony.db` with the following tables:

- `users` — Accounts, roles, OAuth provider info
- `dashboards` — Dashboard metadata and sort order
- `widgets` — Widget layout, config, and appearance (JSON)
- `notification_rules` — Trigger/action definitions with cooldown
- `notification_log` — Last 200 triggered notifications
- `dashboard_access` — Per-user dashboard visibility
- `audit_log` — Last 500 administrative actions

---

## Project Structure

```
nuxt/
├── components/        # UI components (widgets, layout, editor, notifications)
├── composables/       # Vue hooks (useHAClient, useNotificationRules, ...)
├── pages/             # Routes: dashboard, edit, login, setup, admin/*
├── plugins/           # vuetify.ts, ha-websocket.client.ts
├── server/
│   ├── api/           # 33+ REST endpoints
│   ├── middleware/    # API auth guard
│   ├── routes/        # WebSocket proxy (ha-ws)
│   └── utils/         # db.ts (SQLite), ha-api.ts
├── stores/            # Pinia: dashboard.ts, entity.ts
├── types/             # dashboard.ts, ha.ts
└── i18n/locales/      # de, en, es, fr, it, nl
```

---

## Reverse Proxy (Traefik example)

```yaml
labels:
  - traefik.enable=true
  - traefik.http.routers.harmony.rule=Host(`harmony.example.com`)
  - traefik.http.routers.harmony.entrypoints=websecure
  - traefik.http.routers.harmony.tls.certresolver=letsencrypt
  - traefik.http.services.harmony.loadbalancer.server.port=3000
```

---

## License

MIT
