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

## YouTube Transcript Processing

The application includes an async YouTube transcript processing system that uses Bright Data to scrape transcripts and stores them in the database via webhooks.

### Overview

The system processes YouTube transcripts asynchronously:
1. User submits a YouTube URL
2. A Source record is created immediately
3. Bright Data is triggered to scrape the transcript
4. Frontend polls for completion status
5. Bright Data sends webhook when transcript is ready
6. Webhook handler saves transcript to database
7. Frontend detects completion and navigates to the note

### Architecture

```
┌─────────────┐
│   Frontend  │
│  (Browser)  │
└──────┬──────┘
       │
       │ 1. POST /api/notes/transcripts/async
       │    { url: "https://youtube.com/watch?v=..." }
       │
       ▼
┌─────────────────────────────────────┐
│  Async Endpoint                     │
│  /api/notes/transcripts/async       │
│  - Creates Source record            │
│  - Triggers Bright Data API         │
│  - Returns sourceId immediately     │
└──────┬──────────────────────────────┘
       │
       │ 2. Creates Source (status: pending)
       │
       ▼
┌─────────────────────────────────────┐
│     Bright Data API                 │
│  - Scrapes YouTube transcript       │
│  - Processes video data             │
└──────┬──────────────────────────────┘
       │
       │ 3. POST /api/webhooks/bright-data
       │    (when transcript ready)
       │
       ▼
┌─────────────────────────────────────┐
│  Webhook Handler                    │
│  /api/webhooks/bright-data          │
│  - Validates payload                │
│  - Saves transcript to SourceText   │
│  - Returns 200 OK                   │
└─────────────────────────────────────┘
       │
       │ 4. Source now has texts
       │
       ▼
┌─────────────────────────────────────┐
│  Status Endpoint                    │
│  /api/notes/transcripts/status/[id] │
│  - Checks if texts exist            │
│  - Returns "pending" or "completed" │
└─────────────────────────────────────┘
       │
       │ 5. Frontend polls every 2s
       │
       ▼
┌─────────────┐
│   Frontend  │
│  Detects    │
│  Completion │
└─────────────┘
```

### Components

#### 1. Frontend Form (`youtube-input-form-async.tsx`)

Located at: `app/(protected)/notes/_components/youtube-input-form-async.tsx`

**Features:**
- Accepts YouTube URL or video ID
- Submits to `/api/notes/transcripts/async`
- Polls status endpoint every 2 seconds
- Shows "Processing..." state
- Automatically navigates when complete
- Handles errors gracefully

**Usage:**
```tsx
import { YouTubeInputFormAsync } from "./_components/youtube-input-form-async";

<YouTubeInputFormAsync
  onSuccess={(sourceId) => router.push(`/notes/${sourceId}`)}
/>
```

#### 2. Async Initiation Endpoint

**Route:** `POST /api/notes/transcripts/async`

**Location:** `app/api/notes/transcripts/async/route.ts`

**What it does:**
1. Validates YouTube URL and extracts video ID
2. Creates a `Source` record in the database (type: "youtube")
3. Triggers Bright Data API to scrape the transcript
4. Returns `sourceId` immediately to frontend

**Request:**
```json
{
  "url": "https://www.youtube.com/watch?v=VIDEO_ID"
}
```

**Response:**
```json
{
  "sourceId": "uuid-here",
  "status": "pending",
  "message": "Transcript processing initiated..."
}
```

#### 3. Bright Data API Integration

The system integrates with Bright Data's Dataset API to scrape YouTube transcripts.

**Endpoint:** `https://api.brightdata.com/datasets/v3/trigger`

**Request Format:**
```javascript
POST https://api.brightdata.com/datasets/v3/trigger?dataset_id=YOUR_DATASET_ID&endpoint=WEBHOOK_URL&format=json&uncompressed_webhook=true&include_errors=true

Body: [
  {
    "url": "https://www.youtube.com/watch?v=VIDEO_ID",
    "country": "",
    "transcription_language": "",
    "sourceId": "uuid-from-step-2",
    "ownerId": "user-id"
  }
]
```

The `sourceId` and `ownerId` are included so Bright Data can pass them back in the webhook.

#### 4. Webhook Handler

**Route:** `POST /api/webhooks/bright-data`

**Location:** `app/api/webhooks/bright-data/route.ts`

**What it does:**
1. Receives transcript data from Bright Data
2. Validates the payload (array format)
3. Extracts `sourceId` from payload (or creates new source)
4. Saves transcript segments to `SourceText` table
5. Updates Source URL and title if needed
6. Returns 200 OK to confirm to Bright Data

**Bright Data Payload Format:**
```json
[
  {
    "url": "https://www.youtube.com/watch?v=VIDEO_ID",
    "video_id": "VIDEO_ID",
    "title": "Video Title",
    "transcript": "Raw transcript string...",
    "formatted_transcript": [
      {
        "text": "Transcript segment text",
        "start": 0.5,
        "duration": 3.2
      }
    ],
    "sourceId": "uuid-from-initial-request",
    "ownerId": "user-id"
  }
]
```

**Processing:**
- Prefers `formatted_transcript` array if available
- Falls back to parsing raw `transcript` string
- Normalizes timestamps (converts seconds to milliseconds)
- Creates multiple `SourceText` records (one per segment)

#### 5. Status Endpoint

**Route:** `GET /api/notes/transcripts/status/[sourceId]`

**Location:** `app/api/notes/transcripts/status/[sourceId]/route.ts`

**What it does:**
1. Authenticates the user
2. Finds the Source by `sourceId`
3. Verifies ownership
4. Checks if any `SourceText` records exist
5. Returns status: `"pending"`, `"completed"`, or `"not_found"`

**Response:**
```json
{
  "status": "completed", // or "pending" or "not_found"
  "sourceId": "uuid-here",
  "hasTexts": true
}
```

### Setup

#### Environment Variables

Add these to your `.env.local`:

```env
# Bright Data Configuration
BRIGHT_DATA_API_KEY=your-api-key-here
BRIGHT_DATA_DATASET_ID=your-dataset-id-here
BRIGHT_DATA_WEBHOOK_URL=https://your-domain.com/api/webhooks/bright-data

# For local development, use ngrok or similar:
# BRIGHT_DATA_WEBHOOK_URL=https://xxxx.ngrok-free.app/api/webhooks/bright-data

# Neon Database (already required)
DATABASE_URL=your-neon-database-url
```

#### Bright Data Configuration

1. **Create a Dataset:**
   - Go to Bright Data dashboard
   - Create a new YouTube transcript dataset
   - Note your Dataset ID

2. **Configure Webhook:**
   - Set up webhook URL in Bright Data dashboard
   - Or pass `endpoint` query parameter in API requests (recommended)

3. **Get API Key:**
   - Generate API key in Bright Data dashboard
   - Add to environment variables

#### Database Schema

The system uses these Prisma models:

```prisma
model Source {
  id        String   @id @default(uuid())
  ownerId   String
  type      SourceType  // "youtube"
  url       String?
  title     String?
  texts     SourceText[]
  // ...
}

model SourceText {
  id        String   @id @default(uuid())
  sourceId  String
  ownerId   String
  ordinal   Int      // Order of segment
  text      String   // Transcript text
  startSec  Int?     // Start time in seconds
  endSec    Int?     // End time in seconds
  // ...
}
```

### Usage

#### Frontend Integration

The transcript page is available at `/transcript`:

```tsx
// Navigate to /transcript
// User enters YouTube URL
// Form submits to async endpoint
// Polling starts automatically
// User is redirected when complete
```

#### Direct API Usage

**Initiate Processing:**
```bash
curl -X POST http://localhost:3000/api/notes/transcripts/async \
  -H "Content-Type: application/json" \
  -H "Cookie: your-session-cookie" \
  -d '{"url": "https://www.youtube.com/watch?v=VIDEO_ID"}'
```

**Check Status:**
```bash
curl http://localhost:3000/api/notes/transcripts/status/SOURCE_ID \
  -H "Cookie: your-session-cookie"
```

### Flow Example

1. **User Action:**
   - User goes to `/transcript` page
   - Enters: `https://www.youtube.com/watch?v=dQw4w9WgXcQ`
   - Clicks "Generate Notes from YouTube"

2. **Backend Processing:**
   ```
   Frontend → POST /api/notes/transcripts/async
   ↓
   Creates Source (id: abc-123, status: pending)
   ↓
   Triggers Bright Data API
   ↓
   Returns { sourceId: "abc-123", status: "pending" }
   ```

3. **Frontend Polling:**
   ```
   Every 2 seconds:
   GET /api/notes/transcripts/status/abc-123
   → { status: "pending" }
   ```

4. **Bright Data Processing:**
   ```
   Bright Data scrapes transcript (30-60 seconds)
   ↓
   POST /api/webhooks/bright-data
   { transcript: [...], sourceId: "abc-123" }
   ↓
   Webhook saves SourceText records
   ↓
   Returns 200 OK
   ```

5. **Completion:**
   ```
   Frontend polls again:
   GET /api/notes/transcripts/status/abc-123
   → { status: "completed", hasTexts: true }
   ↓
   onSuccess("abc-123") called
   ↓
   Router navigates to /notes/abc-123
   ```

### Error Handling

**Common Issues:**

1. **"Failed to check status"**
   - Check authentication
   - Verify sourceId exists
   - Check server logs

2. **Transcript never completes**
   - Check Bright Data API logs
   - Verify webhook URL is accessible
   - Check webhook handler logs
   - Verify DATABASE_URL is correct

3. **Webhook not received**
   - Verify webhook URL is publicly accessible
   - Check Bright Data dashboard for webhook logs
   - Verify endpoint URL encoding in API request

4. **Authentication errors**
   - Ensure user is logged in
   - Check session cookies
   - Verify Neon Auth configuration

### Default Owner ID

The webhook handler defaults `ownerId` to `"dc211fbb-fb9b-45f3-adc8-570ad79bbffa"` if not provided in the payload. This ensures transcripts are saved even if the ownerId is missing from the Bright Data response.

### Files Overview

- `app/api/notes/transcripts/async/route.ts` - Initiation endpoint
- `app/api/webhooks/bright-data/route.ts` - Webhook handler
- `app/api/notes/transcripts/status/[sourceId]/route.ts` - Status endpoint
- `app/(protected)/transcript/page.tsx` - Transcript page
- `app/(protected)/transcript/_components/transcript-empty-state.tsx` - Form component
- `app/(protected)/notes/_components/youtube-input-form-async.tsx` - Async form component

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

