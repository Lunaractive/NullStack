# Developer Portal - Quick Start Guide

## Installation & Setup

### 1. Install Dependencies

```bash
cd apps/developer-portal
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` and set your API URL:
```env
VITE_API_URL=http://localhost:3000
```

### 3. Start Development Server

```bash
npm run dev
```

The portal will be available at: **http://localhost:3001**

## Key Features

### 1. Authentication
- **Login**: `/login` - Developer authentication
- **Register**: `/register` - New developer registration
- Auto-redirect to dashboard when authenticated
- JWT token-based authentication with automatic refresh

### 2. Dashboard (`/dashboard`)
- View all your game titles
- Create new titles
- Quick access to API keys
- Delete titles (with confirmation)

### 3. Title Management (`/titles/:titleId`)

#### Overview Tab
- View title statistics
- Copy API credentials (Title ID, API Key, Secret Key)
- Regenerate API keys
- Quick links to documentation

#### Players Tab
- Search players by ID, email, or display name
- View player details (created date, last login)
- Ban/unban players with reason tracking
- Player status indicators

#### Economy Tab
- **Currencies**: Create and manage virtual currencies
- **Catalog Items**: Define in-game items with properties
- Support for virtual and real currency pricing
- Item stackability and tradability settings

#### CloudScript Tab
- Write server-side JavaScript functions
- Built-in code editor with syntax highlighting
- Save and manage multiple functions
- Delete functions with confirmation

#### Analytics Tab
- Active users charts
- New user tracking
- Session analytics
- Time period selection (day/week/month)
- Interactive charts with Recharts

#### Settings Tab
- Configure title settings
- Toggle guest logins
- Enable/disable analytics
- Danger zone for destructive actions

## Component Library

### UI Components (src/components/)

- **Button** - Primary, secondary, danger, ghost variants
- **Input** - Form inputs with label and error states
- **Card** - Container component with header/content
- **Modal** - Accessible modal dialogs
- **Table** - Data tables with sorting
- **Tabs** - Tab navigation component
- **Navbar** - Top navigation bar
- **StatCard** - Statistics display cards
- **LoadingSpinner** - Loading indicators

### Usage Example

```tsx
import { Button, Input, Card } from '@/components';

function MyComponent() {
  return (
    <Card>
      <Input label="Name" placeholder="Enter name" />
      <Button variant="primary">Save</Button>
    </Card>
  );
}
```

## API Integration

### Client Configuration (src/api/client.ts)

The API client automatically handles:
- Authentication headers
- Token refresh
- Error handling
- Request/response interceptors
- Toast notifications

### Making API Calls

```tsx
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiClient } from '@/api/client';

// Query example
const { data, isLoading } = useQuery({
  queryKey: ['titles'],
  queryFn: () => apiClient.getTitles(),
});

// Mutation example
const mutation = useMutation({
  mutationFn: (name: string) => apiClient.createTitle(name),
  onSuccess: () => {
    // Handle success
  },
});
```

## Authentication Context

```tsx
import { useAuth } from '@/contexts/AuthContext';

function MyComponent() {
  const { developer, login, logout, isAuthenticated } = useAuth();

  // Use authentication state
}
```

## Development Tips

### Hot Module Replacement
Vite provides instant HMR. Changes appear immediately without full page reload.

### TypeScript
All components are fully typed. Use TypeScript for type safety:
```tsx
import { Title, Player } from '@/types';
```

### Styling
Use Tailwind utility classes:
```tsx
<div className="bg-dark-800 border border-dark-700 rounded-lg p-6">
  <h1 className="text-2xl font-bold text-white">Title</h1>
</div>
```

### Custom Colors
```tsx
// Primary colors
className="bg-primary-500 text-primary-50"

// Dark theme colors
className="bg-dark-800 text-dark-200"
```

## Building for Production

```bash
# Build the app
npm run build

# Preview production build
npm run preview
```

Build output goes to `dist/` directory.

## Docker Deployment

```bash
# Build image
docker build -t developer-portal .

# Run container
docker run -p 80:80 developer-portal
```

The Dockerfile uses multi-stage builds:
1. Build stage: Install deps and build app
2. Production stage: Serve with Nginx

## Troubleshooting

### Port Already in Use
Change the port in `vite.config.ts`:
```ts
server: {
  port: 3002, // Change this
}
```

### API Connection Issues
Check that:
1. API Gateway is running
2. `VITE_API_URL` in `.env` is correct
3. CORS is configured on the API

### Build Errors
Clear cache and reinstall:
```bash
rm -rf node_modules dist
npm install
npm run build
```

## File Structure

```
developer-portal/
├── src/
│   ├── api/client.ts           # API client
│   ├── components/             # UI components (9 files)
│   ├── contexts/AuthContext    # Auth state
│   ├── pages/                  # Page components (4 files)
│   ├── types/index.ts          # TypeScript types
│   ├── App.tsx                 # Main app + routing
│   ├── main.tsx                # Entry point
│   └── index.css               # Global styles
├── public/                     # Static assets
├── Dockerfile                  # Docker config
├── nginx.conf                  # Nginx config
├── package.json                # Dependencies
├── tsconfig.json               # TypeScript config
├── vite.config.ts              # Vite config
└── tailwind.config.js          # Tailwind config
```

## Next Steps

1. Start the development server
2. Create a developer account at `/register`
3. Log in and create your first title
4. Explore the title management features
5. Integrate with your game using the API keys

## Support

For issues or questions:
- Check the main README.md
- Review API documentation
- Check NullStack docs at https://docs.nullstack.com

Happy developing!
