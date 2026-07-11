# sp1d3r.d31337m3.com

React 19 + TypeScript 6 + Vite 8 + MUI v9 single-page application for the Sp1d3r platform. Provides admin and user dashboards, authenticating against the d31337m3 backend services through an nginx reverse proxy.

## Tech Stack

- React 19.2
- TypeScript 6.0
- Vite 8.1
- MUI 9.2 (Material UI)
- Emotion (CSS-in-JS)
- React Router DOM 7.18

## Setup

```bash
npm install
```

### Development

```bash
npm run dev
```

Starts the Vite dev server on `http://localhost:5173`.

### Build

```bash
VITE_CITYHALL_URL=/cityhall \
VITE_DIRECTOR_URL=/director \
VITE_INBOXER_URL=/inboxer \
VITE_SP1D3R_URL=/sp1d3r \
VITE_HISTORIAN_URL=/historian \
VITE_LAWYER_URL=/lawyer \
VITE_PICASO_URL=/picaso \
VITE_SPIDERWIRE_URL=/spiderwire \
VITE_BANKER_URL=/banker \
npm run build
```

### Other Scripts

| Command | Description |
|---------|-------------|
| `npm run lint` | Run Oxlint |
| `npm run preview` | Preview the production build locally |

## Environment Variables

All URL variables are path prefixes routed through nginx. They point to the respective backend services.

| Variable | Default Path | Service |
|----------|-------------|---------|
| `VITE_CITYHALL_URL` | `/cityhall` | CityHall - User/admin management |
| `VITE_DIRECTOR_URL` | `/director` | Director - Node orchestration |
| `VITE_INBOXER_URL` | `/inboxer` | Inboxer - Messaging |
| `VITE_SP1D3R_URL` | `/sp1d3r` | Sp1d3r - Core service |
| `VITE_HISTORIAN_URL` | `/historian` | Historian - Historical data |
| `VITE_LAWYER_URL` | `/lawyer` | Lawyer - Legal/compliance |
| `VITE_PICASO_URL` | `/picaso` | Picaso - Document/template rendering |
| `VITE_SPIDERWIRE_URL` | `/spiderwire` | SpiderWire - Blockchain wire protocol |
| `VITE_BANKER_URL` | `/banker` | Banker - Payments/subscriptions |

## Project Structure

```
src/
  api/
    client.ts              # API client with JWT auth, routes to all 9 services
  assets/                  # Static assets
  components/
    AuthGuard.tsx          # Protected route wrapper
    Layout.tsx             # App shell / nav layout
    ThemeToggle.tsx        # Dark/light theme switcher
  context/
    AuthContext.tsx         # Auth state, JWT token management
  pages/
    Landing.tsx            # Public landing page
    Login.tsx              # Login form
    Register.tsx           # Registration form
    admin/
      AdminDashboard.tsx       # Admin overview stats
      BlockchainDetails.tsx    # Chain state inspection
      Documents.tsx            # Template CRUD (create/preview/edit/delete)
      EmailSettings.tsx        # SMTP configuration
      LogViewer.tsx            # Service log viewer
      NetworkConfig.tsx        # Network configuration
      NodeManagement.tsx       # 5 tabs: live nodes, operators, peers, tasks, IP blacklist
      PaymentProcessing.tsx    # Payment history
      PlatformHealth.tsx       # Cross-service health checks
      PricingTiers.tsx         # Subscription tier management
      ServiceMonitor.tsx       # Service status, restart/kill controls
      UserManagement.tsx       # User list, search, suspend
    dashboard/
      SubscriptionOnboarding.tsx  # Nodeop detection, crypto tx, Interac confirmation
      UserDashboard.tsx           # Chain status, connected nodes, crawl runner
      UserSettings.tsx            # Profile management
    support/
      SupportChat.tsx            # Customer support chat
  theme/
    theme.ts               # MUI theme configuration
  App.tsx                  # Router and app root
  main.tsx                 # Entry point
```

## Features

### Authentication
JWT-based auth with login, registration, and token management via `AuthContext`.

### Admin Dashboard
- **AdminDashboard** - Platform overview and stats
- **UserManagement** - List, search, and suspend users
- **ServiceMonitor** - Monitor all 9 backend services with health status, restart/kill controls
- **NodeManagement** - 5 tabs: live nodes (director), node operators (cityhall), peers (sp1d3r), tasks with create dialog, IP blacklist
- **Documents** - CRUD for document templates with preview
- **PricingTiers** - Manage subscription tiers
- **PaymentProcessing** - Payment history
- **LogViewer** - View service logs
- **EmailSettings** - SMTP configuration
- **PlatformHealth** - Cross-service health checks
- **BlockchainDetails** - Chain state inspection
- **NetworkConfig** - Network configuration

### User Dashboard
- **UserDashboard** - Chain status cards, connected nodes, crawl runner
- **UserSettings** - Profile management
- **SubscriptionOnboarding** - Nodeop detection, crypto transaction verification, Interac confirmation

### Support
- **SupportChat** - In-app customer support chat
