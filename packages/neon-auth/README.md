# @repo/neon-auth

Shared Neon Auth utilities for Next.js applications in the monorepo.

## Features

- **Server Actions** - Type-safe sign-up, sign-in, and sign-out actions with Zod validation
- **Server Helpers** - Get current session and user on the server
- **Client Utilities** - Create auth client for client components
- **Type Safety** - Full TypeScript support with exported types
- **Environment Validation** - Type-safe environment variable handling

## Installation

This package is part of the monorepo and uses the workspace protocol:

```json
{
  "dependencies": {
    "@repo/neon-auth": "workspace:*"
  }
}
```

## Usage

### Server Actions

#### Sign Up

```typescript
import { useActionState } from "react";
import { signUpAction, type SignUpState } from "@repo/neon-auth";

const initialState: SignUpState = { success: false };

export function SignUpForm() {
  const [state, formAction, isPending] = useActionState(signUpAction, initialState);

  return (
    <form action={formAction}>
      <input name="email" type="email" required />
      <input name="password" type="password" required />
      <input name="name" type="text" />
      <button type="submit" disabled={isPending}>
        Sign Up
      </button>
      {state.message && <p>{state.message}</p>}
      {state.errors && (
        <ul>
          {state.errors.email?.map((error) => (
            <li key={error}>{error}</li>
          ))}
        </ul>
      )}
    </form>
  );
}
```

#### Sign In

```typescript
import { useActionState } from "react";
import { signInAction, type SignInState } from "@repo/neon-auth";

const initialState: SignInState = { success: false };

export function SignInForm() {
  const [state, formAction, isPending] = useActionState(signInAction, initialState);

  return (
    <form action={formAction}>
      <input name="email" type="email" required />
      <input name="password" type="password" required />
      <button type="submit" disabled={isPending}>
        Sign In
      </button>
      {state.message && <p>{state.message}</p>}
    </form>
  );
}
```

#### Sign Out

```typescript
import { signOutAction } from "@repo/neon-auth";

export function SignOutButton() {
  return (
    <form action={signOutAction}>
      <button type="submit">Sign Out</button>
    </form>
  );
}
```

### Server-Side Auth

Get the current session and user:

```typescript
import { getSession } from "@repo/neon-auth";
import { redirect } from "next/navigation";

export default async function ProtectedPage() {
  const { session, user } = await getSession();

  if (!session) {
    redirect("/auth/sign-in");
  }

  return <div>Welcome, {user?.email}</div>;
}
```

### Client-Side Auth

Create an auth client for client components:

```typescript
"use client";

import { createNeonAuthClient } from "@repo/neon-auth";

const authClient = createNeonAuthClient();

// Use authClient methods in your component
```

## Environment Variables

The package requires the following environment variables:

```env
# Server-side
NEON_AUTH_BASE_URL=https://your-neon-auth-instance.com

# Client-side
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

These are validated using `@t3-oss/env-nextjs` for type safety.

## API

### Exports

- `signUpAction` - Server action for user registration
- `signInAction` - Server action for user authentication
- `signOutAction` - Server action for user sign out
- `getSession` - Server function to get current session and user
- `createNeonAuthClient` - Client function to create auth client
- `keys` - Environment variable validation function
- `SignUpState` - TypeScript type for sign-up action state
- `SignInState` - TypeScript type for sign-in action state
- `NeonAuthClient` - TypeScript type for auth client

## Validation

All server actions use Zod schemas for validation:

- **Email**: Required, must be valid email format
- **Password**:
  - Sign up: 6-72 characters
  - Sign in: Required (minimum 1 character)
- **Name**: Optional for sign up

## Error Handling

All actions return structured error states with:
- `success`: Boolean indicating if the action succeeded
- `message`: User-friendly error or success message
- `errors`: Field-level validation errors (for sign-up and sign-in)

## Related Packages

- `@neondatabase/neon-js` - Neon database and auth client
- `@neondatabase/neon-auth-next` - Neon Auth Next.js integration
- `@repo/database` - Prisma database client

