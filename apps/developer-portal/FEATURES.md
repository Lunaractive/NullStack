# NullStack Developer Portal - Feature Overview

## Complete Feature List

### 1. Authentication System

#### Login Page (`/login`)
- Email/password authentication
- Form validation
- Error handling with toast notifications
- Auto-redirect to dashboard on success
- JWT token storage in localStorage
- "Remember me" functionality via token persistence

#### Register Page (`/register`)
- Developer account creation
- Password confirmation
- Minimum password length validation
- Email format validation
- Automatic login after registration
- Error handling for duplicate accounts

#### Auth Context
- Global authentication state
- Token refresh logic
- Auto-login on app load
- Logout functionality
- Session expiry handling
- Protected route enforcement

---

### 2. Dashboard (`/dashboard`)

#### Title Management
- **Grid View**: Responsive card layout for titles
- **Create Title**: Modal dialog with form
  - Title name (required)
  - Description (optional)
  - Auto-generate API keys
- **Delete Title**: Confirmation dialog
- **Empty State**: Helpful message when no titles exist

#### Title Cards
Each card displays:
- Title name and description
- Title ID (copyable)
- API Key (copyable, truncated)
- Created date
- Delete button
- "Manage Title" action button

#### Features
- Search/filter titles
- Sort by date created
- Quick copy API credentials to clipboard
- Responsive grid (1-3 columns based on screen size)
- Loading states with spinners
- Error handling

---

### 3. Title Detail Page (`/titles/:titleId`)

#### Overview Tab

**Statistics Dashboard**
- Total Players count
- Active Players count
- New Players Today
- API Calls (24h)
- Interactive stat cards with icons

**API Credentials Section**
- Title ID (copy to clipboard)
- API Key (copy to clipboard)
- Secret Key (copy to clipboard)
- Regenerate API Key button with confirmation
- Warning about key regeneration

**Quick Links**
- Documentation
- SDK Downloads
- API Reference
- External links open in new tab

---

#### Players Tab

**Search & Filter**
- Search by player ID
- Search by email
- Search by display name
- Real-time search
- Pagination support

**Player Table**
Displays:
- Display name and player ID
- Email address
- Created date
- Last login date
- Status (Active/Banned)
- Actions (Ban/Unban)

**Player Actions**
- Ban player with reason input
- Unban player
- View player details
- Status badges (color-coded)

**Features**
- Responsive table
- Empty state message
- Loading indicators
- Toast notifications for actions

---

#### Economy Tab

**Two Sections**

##### Virtual Currencies
- List all currencies
- Create new currency
  - Currency code (2-3 characters)
  - Currency name
  - Optional: Initial deposit
  - Optional: Recharge rate/max
- Delete currency with confirmation
- Grid card layout

##### Catalog Items
- List all items in table format
- Create new item
  - Item ID (unique identifier)
  - Display name
  - Description
  - Item class
  - Tags
  - Stackable/Tradable flags
  - Virtual currency prices
  - Real currency prices
- Delete item with confirmation
- Empty state for each section

**Features**
- Tab switching between sections
- Modal forms for creation
- Validation
- Real-time updates

---

#### CloudScript Tab

**Function Management**
- List all CloudScript functions
- Create new function
- Edit existing functions
- Delete functions with confirmation

**Code Editor**
- Function name input
- Large textarea for code
- Syntax-friendly monospace font
- Auto-save capability
- Example template for new functions

**Function List**
- Sidebar with all functions
- Click to load in editor
- Active function highlighting
- Delete button per function

**Features**
- Real-time code saving
- Function versioning
- Error handling
- Toast notifications

---

#### Analytics Tab

**Time Period Selection**
- Day view
- Week view
- Month view
- Button toggle for selection

**Charts**

##### Active Users Chart (Line Chart)
- Active users over time
- New users over time
- Dual-line comparison
- Interactive tooltips
- Color-coded legends
- Responsive sizing

##### Sessions Chart (Bar Chart)
- Total sessions per day
- Interactive tooltips
- Gradient fill
- Responsive sizing

**Features**
- Recharts integration
- Dark theme styling
- Interactive legends
- Hover tooltips
- Smooth animations
- Auto-refresh data

---

#### Settings Tab

**Title Configuration**
- Title name (read-only, contact support to change)
- Settings toggles:
  - Allow Guest Logins
  - Enable Analytics
  - Max Players Per Title
  - Session Ticket Expiry

**Toggle Switches**
- Modern iOS-style toggles
- Smooth animations
- State persistence
- Save button

**Danger Zone**
- Delete Title (disabled by default)
- Red border styling
- Warning messages

**Features**
- Real-time settings update
- Confirmation dialogs
- Toast notifications
- Form validation

---

### 4. Navigation & Layout

#### Navbar
- NullStack logo and branding
- Current developer name
- Logout button
- Responsive design
- Sticky positioning

#### Breadcrumbs
- Back to Dashboard link
- Current page indicator
- Keyboard navigation

#### Layout
- Consistent max-width container
- Responsive padding
- Mobile-optimized

---

### 5. UI Components Library

#### Button
**Variants:**
- Primary (blue)
- Secondary (gray)
- Danger (red)
- Ghost (transparent)

**Sizes:**
- Small
- Medium
- Large

**Features:**
- Loading state with spinner
- Disabled state
- Icon support
- Full width option

#### Input
- Label support
- Error messages
- Helper text
- Placeholder
- Validation states
- Dark theme styling

#### Card
- Header section
- Content section
- Title component
- Flexible padding
- Border styling

#### Modal
- Backdrop overlay
- Close on ESC key
- Close on backdrop click
- Header with title
- Close button
- Size variants (sm, md, lg, xl)
- Scroll support
- Focus trap

#### Table
- Header/Body/Row/Cell components
- Sortable columns
- Hover states
- Responsive scrolling
- Dark theme styling
- Empty states

#### Tabs
- Multiple tabs support
- Active state styling
- Icon support
- Keyboard navigation
- Smooth transitions

#### StatCard
- Icon with background
- Title and value
- Trend indicators
- Color variants
- Responsive sizing

#### LoadingSpinner
- Multiple sizes
- Full screen variant
- Smooth animation
- Primary color

---

### 6. State Management

#### React Query
- Server state caching
- Auto-refetch on window focus
- Optimistic updates
- Error retry logic
- Loading states
- Mutation handling

#### Context API
- Authentication state
- Developer information
- Token management
- Global actions

---

### 7. API Integration

#### Features
- Axios HTTP client
- Request interceptors (add auth token)
- Response interceptors (handle errors)
- Automatic token refresh
- 401 redirect to login
- Error toast notifications
- Request/response logging

#### Endpoints Covered
- Auth (login, register, getCurrentDeveloper)
- Titles (CRUD operations)
- Players (search, ban/unban)
- Currencies (CRUD)
- Catalog (CRUD)
- CloudScript (CRUD)
- Analytics (fetch by period)

---

### 8. Responsive Design

#### Breakpoints
- Mobile: < 640px
- Tablet: 640px - 1024px
- Desktop: > 1024px

#### Features
- Mobile-first approach
- Flexible grid layouts
- Responsive tables
- Touch-friendly buttons
- Optimized forms
- Collapsible navigation

---

### 9. Accessibility

#### Features
- Semantic HTML
- ARIA labels
- Keyboard navigation
- Focus management
- Screen reader support
- Color contrast compliance
- Form validation messages

---

### 10. Developer Experience

#### Hot Module Replacement
- Instant updates
- State preservation
- No full page reload

#### TypeScript
- Full type coverage
- IntelliSense support
- Compile-time errors
- Type inference

#### Code Quality
- ESLint rules
- Consistent formatting
- Component structure
- Modular architecture

---

### 11. Performance

#### Optimizations
- Code splitting (React Router)
- Lazy loading
- React Query caching
- Debounced search
- Memoized components
- Optimized re-renders

#### Bundle Size
- Tree shaking
- Minification
- Gzip compression
- Asset optimization

---

### 12. Production Features

#### Docker
- Multi-stage build
- Nginx server
- Production optimizations
- Environment variables
- Health checks

#### Nginx
- SPA routing support
- API proxy
- Gzip compression
- Static asset caching
- Security headers

#### Security
- JWT authentication
- XSS protection
- CSRF tokens
- Secure headers
- Content Security Policy

---

## User Workflows

### First-Time Developer
1. Visit portal
2. Click "Sign up"
3. Fill registration form
4. Auto-login to dashboard
5. Create first title
6. Copy API keys
7. Configure title settings
8. Integrate with game

### Existing Developer
1. Login with credentials
2. View dashboard with titles
3. Select a title to manage
4. Use tabs to manage different aspects
5. Make changes (players, economy, etc.)
6. View analytics
7. Adjust settings
8. Logout

### Managing Players
1. Go to title detail
2. Click Players tab
3. Search for player
4. View player details
5. Ban/unban as needed
6. See updated status

### Creating Economy
1. Go to title detail
2. Click Economy tab
3. Create virtual currencies
4. Create catalog items
5. Set prices
6. Configure properties

### Writing CloudScript
1. Go to title detail
2. Click CloudScript tab
3. Create new function
4. Write JavaScript code
5. Save function
6. Test in game

---

## Design System

### Colors
- **Primary**: Blue (#0ea5e9) - Actions, links
- **Success**: Green (#10b981) - Success states
- **Danger**: Red (#ef4444) - Destructive actions
- **Warning**: Orange (#f97316) - Warnings
- **Dark**: Slate grays - Backgrounds

### Typography
- **Headings**: Bold, large sizes
- **Body**: Regular, readable
- **Code**: Monospace
- **Labels**: Small, uppercase

### Spacing
- Consistent 4px grid
- Generous padding
- Clear visual hierarchy

### Animations
- Smooth transitions (150ms)
- Hover effects
- Loading states
- Fade-in animations

---

## Browser Support
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Mobile Support
- iOS Safari 14+
- Chrome Mobile 90+
- Responsive design
- Touch optimized

---

**This developer portal provides everything needed to manage game backends through an intuitive, modern web interface.**
