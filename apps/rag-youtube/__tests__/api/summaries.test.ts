import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock the dependencies before importing the route
vi.mock("@repo/neon-auth", () => ({
  getSession: vi.fn(),
}));

vi.mock("@repo/prisma-neon", () => ({
  database: {
    note: {
      findMany: vi.fn(),
    },
  },
}));

import { getSession } from "@repo/neon-auth";
import { database } from "@repo/prisma-neon";
// Import after mocks are set up
import { GET } from "@/app/api/summaries/route";

describe("GET /api/summaries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 when user is not authenticated", async () => {
    // Mock unauthenticated session
    vi.mocked(getSession).mockResolvedValue({
      user: null,
      session: null,
    } as any);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return summaries for authenticated user", async () => {
    const mockUser = { id: "user-123", email: "test@example.com" };
    const mockNotes = [
      {
        id: "note-1",
        sourceId: "source-1",
        title: "Note 1",
        summaryMd: "# Summary 1",
        createdAt: new Date("2024-01-01"),
        source: { title: "Source 1" },
      },
      {
        id: "note-2",
        sourceId: "source-2",
        title: null,
        summaryMd: "# Summary 2",
        createdAt: new Date("2024-01-02"),
        source: { title: null },
      },
    ];

    // Mock authenticated session
    vi.mocked(getSession).mockResolvedValue({
      user: mockUser,
      session: {} as any,
    } as any);

    // Mock database query
    vi.mocked(database.note.findMany).mockResolvedValue(mockNotes as any);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.summaries).toHaveLength(2);
    expect(data.summaries[0].id).toBe("note-1");
    expect(data.summaries[0].title).toBe("Note 1");
    expect(data.summaries[1].title).toBe("Untitled Note");
  });

  it("should return 500 on database error", async () => {
    const mockUser = { id: "user-123", email: "test@example.com" };

    vi.mocked(getSession).mockResolvedValue({
      user: mockUser,
      session: {} as any,
    } as any);

    // Mock database error
    vi.mocked(database.note.findMany).mockRejectedValue(
      new Error("Database error")
    );

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toHaveProperty("error");
    expect(typeof data.error).toBe("string");
  });
});
