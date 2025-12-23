# App - Next.js Application with Authentication & Database

A full-stack Next.js 16 application featuring Supabase authentication, Prisma database integration, and server-side validation using Zod.

## Features

### 🔐 Authentication
- **User Sign Up** - Email/password registration with server-side validation
- **User Login** - Secure authentication with session management
- **Email Confirmation** - Email verification flow via Supabase
- **Protected Routes** - Automatic redirects for authenticated/unauthenticated users
- **Session Management** - Server-side session refresh and cookie handling

### 🗄️ Backend & Database
- **Supabase Integration** - Authentication and database backend
- **Prisma ORM** - Type-safe database access via `@repo/database` package
- **Server Actions** - Form handling with validation using Zod
- **API Routes** - RESTful endpoints for authentication callbacks

### 🛡️ Security
- **Server-Side Validation** - Zod schema validation on all form submissions
- **Route Protection** - Proxy-based middleware for route guarding
- **Secure Cookies** - HTTP-only cookie management via Supabase SSR
- **CSRF Protection** - Built-in protection via Next.js Server Actions

## Project Structure

```
apps/app/
├── app/
│   ├── (auth)/              # Route group for auth pages
│   │   ├── login/
│   │   │   └── page.tsx     # Login page
│   │   └── signup/
│   │       ├── actions.ts   # Server Action with Zod validation
│   │       └── page.tsx     # Sign up page
│   ├── api/
│   │   └── auth/
│   │       └── callback/
│   │           └── route.ts # Email confirmation handler
│   ├── dashboard/
│   │   └── page.tsx         # Protected dashboard page
│   ├── layout.tsx           # Root layout
│   └── page.tsx             # Home page (redirects to dashboard if logged in)
├── lib/
│   ├── supabase/
│   │   ├── client.ts        # Browser Supabase client
│   │   └── server.ts         # Server Supabase client
│   └── utils.ts             # Utility functions
├── __tests__/               # Test files
├── proxy.ts                 # Route protection middleware (Next.js 16)
├── next.config.ts           # Next.js configuration
└── package.json             # Dependencies and scripts
```

## Environment Variables

Create a `.env.local` file in the `apps/app` directory with the following variables:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

# Optional: Site URL for email redirects
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### Getting Supabase Credentials

If using local Supabase (recommended for development):

1. Start Supabase locally:
   ```bash
   npx supabase start
   ```

2. Get your credentials:
   ```bash
   npx supabase status
   ```

3. Copy the `API URL` and `anon key` to your `.env.local` file.

## Getting Started

### Prerequisites

- Node.js 18+ and pnpm
- Docker (for local Supabase)
- Supabase CLI (for local development)

### Installation

1. Install dependencies from the monorepo root:
   ```bash
   pnpm install
   ```

2. Start local Supabase (if not already running):
   ```bash
   npx supabase start
   ```

3. Set up environment variables (see above)

4. Run the development server:
   ```bash
   cd apps/app
   pnpm dev
   ```

5. Open [http://localhost:3000](http://localhost:3000)

## Authentication Flow

### Sign Up Flow

1. User visits `/signup`
2. Fills out form with email and password
3. **Server Action** (`signupAction`) validates input with Zod:
   - Email: Required, valid email format
   - Password: 6-72 characters
4. If validation passes, Supabase creates user account
5. User receives confirmation email (if email confirmation enabled)
6. User clicks link → redirected to `/api/auth/callback`
7. Callback route exchanges code for session
8. User redirected to dashboard

### Login Flow

1. User visits `/login` (or redirected from protected route)
2. Enters email and password
3. Supabase authenticates credentials
4. Session created and stored in HTTP-only cookies
5. User redirected to `/dashboard` (or original destination)

### Route Protection

The `proxy.ts` file handles route protection:

- **Public Routes**: `/login`, `/signup`, `/api/auth/callback`
- **Protected Routes**: All other routes require authentication
- **Auto-redirects**:
  - Unauthenticated users → `/login?redirect=<original-path>`
  - Authenticated users visiting `/`, `/login`, or `/signup` → `/dashboard`

## Backend Integration

### Supabase Client Usage

#### Browser (Client Components)

```typescript
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();
const { data, error } = await supabase.auth.getUser();
```

#### Server (Server Components, Actions, API Routes)

```typescript
import { createClient } from "@/lib/supabase/server";

const supabase = await createClient();
const { data, error } = await supabase.auth.getUser();
```

### Database Access (Prisma)

The app uses the shared `@repo/database` package for database operations:

```typescript
import { database } from "@repo/database";

// Example: Get all users
const users = await database.user.findMany();
```

**Note**: The database package is configured to connect to your Supabase PostgreSQL instance. See `packages/database/README.md` for more details.

## Server Actions

### Sign Up Action

Located in `app/(auth)/signup/actions.ts`:

```typescript
export async function signupAction(
  _prevState: SignupState,
  formData: FormData
): Promise<SignupState>
```

**Features:**
- Zod schema validation
- Field-level error messages
- Supabase user creation
- Email confirmation setup

**Usage:**

```tsx
import { useActionState } from "react";
import { signupAction } from "./actions";

const [state, formAction, isPending] = useActionState(signupAction, initialState);

<form action={formAction}>
  {/* Form fields */}
</form>
```

## Development

### Available Scripts

```bash
# Start development server
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start

# Type checking
pnpm typecheck

# Run tests
pnpm test

# Run tests once
pnpm test:run

# Clean build artifacts
pnpm clean
```

### Testing

Tests are located in the `__tests__` directory and use Vitest with React Testing Library.

Run tests:
```bash
pnpm test        # Watch mode
pnpm test:run    # Single run
```

## Architecture

### Authentication Architecture

```
┌─────────────┐
│   Browser   │
└──────┬──────┘
       │
       ▼
┌─────────────────┐
│  Next.js Proxy  │  ← Route protection & session refresh
│   (proxy.ts)    │
└──────┬──────────┘
       │
       ▼
┌─────────────────┐
│  Supabase SSR   │  ← Session management via cookies
│   (@supabase/ssr)│
└──────┬──────────┘
       │
       ▼
┌─────────────────┐
│  Supabase Auth  │  ← User authentication
│   (Local/Cloud)  │
└─────────────────┘
```

### Form Validation Flow

```
User Input
    │
    ▼
Client-Side HTML5 Validation (required, type, minLength)
    │
    ▼
Form Submission → Server Action
    │
    ▼
Zod Schema Validation
    │
    ├─► Invalid → Return field errors
    │
    └─► Valid → Supabase API Call
            │
            ├─► Error → Return error message
            │
            └─► Success → Redirect to dashboard
```

## Security Considerations

1. **Server-Side Validation**: All form data is validated on the server using Zod, even if client-side validation exists.

2. **HTTP-Only Cookies**: Session tokens are stored in HTTP-only cookies, preventing XSS attacks.

3. **CSRF Protection**: Next.js Server Actions provide built-in CSRF protection.

4. **Route Protection**: The proxy middleware ensures unauthenticated users cannot access protected routes.

5. **Password Requirements**: Enforced via Zod schema (6-72 characters).

## Troubleshooting

### "Connection refused" when connecting to Supabase

- Ensure Supabase is running: `npx supabase status`
- Check that `NEXT_PUBLIC_SUPABASE_URL` matches your local instance
- Verify Docker is running

### Authentication not working

- Check browser console for errors
- Verify environment variables are set correctly
- Ensure cookies are not being blocked
- Check Supabase logs: `npx supabase logs`

### Database connection issues

- Verify `DATABASE_URL` in `packages/database` is correct
- Check Prisma schema is up to date: `cd packages/database && pnpm build`
- Ensure Supabase PostgreSQL is running

## Related Packages

- `@repo/design-system` - Shared UI components
- `@repo/database` - Prisma database client
- `@repo/typescript-config` - TypeScript configuration

## Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Zod Documentation](https://zod.dev)

