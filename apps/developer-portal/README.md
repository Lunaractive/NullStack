# NullStack Developer Portal

A modern React-based developer portal for managing game titles, players, economy, CloudScript functions, and analytics on the NullStack platform.

## Features

- **Authentication** - Secure developer login and registration
- **Dashboard** - Overview of all your game titles
- **Title Management** - Comprehensive management interface for each title:
  - **Overview** - Stats, API keys, and quick links
  - **Players** - Search, view, and manage player accounts (ban/unban)
  - **Economy** - Manage virtual currencies and catalog items
  - **CloudScript** - Write and deploy server-side functions
  - **Analytics** - Track player activity and engagement metrics
  - **Settings** - Configure title settings and preferences

## Tech Stack

- **React 18** - Modern React with hooks
- **TypeScript** - Type-safe development
- **Vite** - Fast build tool and dev server
- **TailwindCSS** - Utility-first styling
- **React Router** - Client-side routing
- **React Query** - Data fetching and caching
- **Recharts** - Analytics and data visualization
- **Axios** - HTTP client with interceptors
- **Lucide React** - Beautiful icon library

## Getting Started

### Prerequisites

- Node.js 20+
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Update .env with your API URL
VITE_API_URL=http://localhost:3000
```

### Development

```bash
# Start dev server
npm run dev

# The app will be available at http://localhost:3001
```

### Building for Production

```bash
# Build the application
npm run build

# Preview production build
npm run preview
```

### Docker

```bash
# Build Docker image
docker build -t nullstack-developer-portal .

# Run container
docker run -p 80:80 nullstack-developer-portal
```

## Project Structure

```
developer-portal/
├── src/
│   ├── api/              # API client and endpoints
│   ├── components/       # Reusable UI components
│   ├── contexts/         # React contexts (Auth)
│   ├── pages/            # Page components
│   │   ├── Login.tsx
│   │   ├── Register.tsx
│   │   ├── Dashboard.tsx
│   │   └── TitleDetail.tsx
│   ├── types/            # TypeScript type definitions
│   ├── App.tsx           # Main app component
│   ├── main.tsx          # Entry point
│   └── index.css         # Global styles
├── public/               # Static assets
├── Dockerfile            # Docker configuration
├── nginx.conf            # Nginx configuration
├── vite.config.ts        # Vite configuration
├── tailwind.config.js    # Tailwind configuration
└── tsconfig.json         # TypeScript configuration
```

## Environment Variables

- `VITE_API_URL` - Backend API URL (default: http://localhost:3000)
- `VITE_APP_NAME` - Application name
- `VITE_APP_VERSION` - Application version

## API Integration

The portal integrates with the NullStack API Gateway. All requests include:

- JWT authentication tokens
- Automatic token refresh
- Error handling and user notifications
- Request/response interceptors

## Design System

### Colors

- **Primary** - Blue (#0ea5e9) - Main brand color
- **Dark** - Slate grays - Background and UI elements
- **Success** - Green (#10b981)
- **Danger** - Red (#ef4444)
- **Warning** - Orange (#f97316)

### Components

All components follow a consistent design pattern:
- Dark theme optimized for developer workflows
- Responsive design for all screen sizes
- Accessible form controls
- Loading states and error handling
- Toast notifications for user feedback

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

Copyright (c) 2024 NullStack. All rights reserved.
