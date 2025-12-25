# @repo/prisma-neon

Prisma client package configured for Neon database with WebSocket support.

## Setup

This package requires the Prisma client to be generated before use. The generated client is located in the `./generated` directory.

## Generating the Prisma Client

To generate the Prisma client, run:

```bash
pnpm build
```

Or from the workspace root:

```bash
cd packages/prisma-neon && pnpm build
```

This will:
- Read the Prisma schema from `prisma/schema.prisma`
- Generate the Prisma client to `./generated/client`
- Make the client available for import in other packages

## When to Regenerate

You need to regenerate the Prisma client when:
- After cloning the repository for the first time
- After pulling changes that modify `prisma/schema.prisma`
- After running migrations that change the schema
- If you see the error: `Module not found: Can't resolve './generated/client'`

## Usage

Import the database client and Prisma types:

```typescript
import { database } from "@repo/prisma-neon";
import type { Note, Source } from "@repo/prisma-neon";

// Use the database client
const notes = await database.note.findMany({
  where: { ownerId: user.id },
});
```

## Configuration

- **Schema**: `prisma/schema.prisma`
- **Output**: `./generated/client`
- **Adapter**: `@prisma/adapter-neon` for Neon database compatibility
- **WebSocket**: Configured with `ws` for serverless environments

## Troubleshooting

### Error: "Module not found: Can't resolve './generated/client'"

This means the Prisma client hasn't been generated. Run:

```bash
pnpm build
```

### Build fails with database connection errors

The build process doesn't require a database connection. If you see connection errors, check your `DATABASE_URL` environment variable, but the build should still succeed.

