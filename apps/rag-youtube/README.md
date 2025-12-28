# Neon Auth - Next.js Application with Neon Database

A Next.js 16 application demonstrating authentication with Neon database integration using Neon Auth.

## Features

- **Neon Auth Integration** - Complete authentication system powered by Neon Auth
- **Server Actions** - Type-safe sign-up, sign-in, and sign-out actions with Zod validation
- **Neon Database Integration** - Serverless PostgreSQL via `@repo/prisma-neon`
- **Prisma ORM** - Type-safe database access via `@repo/database` package
- **Theme Support** - Light/dark mode with `@repo/design-system`
- **Modern UI** - Built with Tailwind CSS, shadcn/ui components, and Neon Auth UI
- **Email OTP** - Email-based one-time password authentication
- **Protected Routes** - Server-side session management and route protection

## Project Structure

```
apps/neon-auth/
├── app/
│   ├── api/
│   │   └── auth/
│   │       └── [...path]/
│   │           └── route.ts  # Auth API route handler
│   ├── auth/
│   │   └── [path]/
│   │       └── page.tsx      # Auth pages (sign-in, sign-up, etc.)
│   ├── account/
│   │   └── [path]/
│   │       └── page.tsx      # Account management pages
│   ├── dashboard/
│   │   └── page.tsx         # Protected dashboard page
│   ├── layout.tsx           # Root layout with NeonAuthUIProvider
│   ├── page.tsx             # Home page
│   └── styles.css           # Global styles
├── lib/
│   └── auth/
│       ├── actions.ts       # Server actions (sign-up, sign-in, sign-out)
│       ├── client.ts        # Client-side auth client
│       └── server.ts        # Server-side auth helpers
├── next.config.ts           # Next.js configuration
├── package.json             # Dependencies and scripts
└── tsconfig.json            # TypeScript configuration
```

## Getting Started

### Prerequisites

- Node.js 18+ and pnpm
- Neon database connection string
- Neon Auth base URL

### Installation

1. Install dependencies from the monorepo root:
   ```bash
   pnpm install
   ```

2. Set up environment variables:
   Create a `.env.local` file in the `apps/neon-auth` directory:
   ```env
   # Neon Auth Configuration
   NEON_AUTH_BASE_URL=your-neon-auth-base-url
   NEXT_PUBLIC_SITE_URL=http://localhost:3010
   ```

3. Run the development server:
   ```bash
   cd apps/neon-auth
   pnpm dev
   ```

4. Open [http://localhost:3010](http://localhost:3010)

## Available Scripts

```bash
# Start development server
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start

# Type checking
pnpm typecheck

# Clean build artifacts
pnpm clean
```

## Authentication

### Server Actions

The app includes type-safe server actions for authentication:

#### Sign Up

```typescript
import { useActionState } from "react";
import { signUpAction } from "@/lib/auth/actions";

const [state, formAction, isPending] = useActionState(signUpAction, {
  success: false,
});

<form action={formAction}>
  <input name="email" type="email" required />
  <input name="password" type="password" required />
  <input name="name" type="text" />
  <button type="submit" disabled={isPending}>
    Sign Up
  </button>
</form>
```

**Features:**
- Zod schema validation for email, password, and optional name
- Field-level error messages
- Automatic email verification setup
- Type-safe state management

#### Sign In

```typescript
import { useActionState } from "react";
import { signInAction } from "@/lib/auth/actions";

const [state, formAction, isPending] = useActionState(signInAction, {
  success: false,
});

<form action={formAction}>
  <input name="email" type="email" required />
  <input name="password" type="password" required />
  <button type="submit" disabled={isPending}>
    Sign In
  </button>
</form>
```

**Features:**
- Zod schema validation
- Automatic redirect to dashboard on success
- Error handling with user-friendly messages

#### Sign Out

```typescript
import { signOutAction } from "@/lib/auth/actions";

<form action={signOutAction}>
  <button type="submit">Sign Out</button>
</form>
```

**Features:**
- Clears session and redirects to home page
- Handles errors gracefully

### Server-Side Auth

Get the current session and user on the server:

```typescript
import { getSession } from "@/lib/auth/server";

export default async function ProtectedPage() {
  const { session, user } = await getSession();

  if (!session) {
    redirect("/auth/sign-in");
  }

  return <div>Welcome, {user?.email}</div>;
}
```

### Client-Side Auth

The auth client is available for client components:

```typescript
import { authClient } from "@/lib/auth/client";

// Use authClient methods in client components
```

### Auth Routes

- `/auth/sign-in` - Sign in page
- `/auth/sign-up` - Sign up page
- `/auth/[path]` - Other auth flows (handled by Neon Auth UI)
- `/account/[path]` - Account management pages
- `/dashboard` - Protected dashboard page

### API Routes

The app includes a catch-all auth API route at `/api/auth/[...path]` that handles all Neon Auth API requests.

## Related Packages

- `@neondatabase/neon-js` - Neon database and auth client
- `@neondatabase/neon-auth-next` - Neon Auth Next.js integration
- `@neondatabase/neon-auth-ui` - Neon Auth UI components
- `@repo/design-system` - Shared UI components
- `@repo/database` - Prisma database client
- `@repo/prisma-neon` - Neon database adapter
- `@repo/typescript-config` - TypeScript configuration

## Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Neon Documentation](https://neon.tech/docs)
- [Neon Auth Documentation](https://neon.tech/docs/auth)
- [Prisma Documentation](https://www.prisma.io/docs)

