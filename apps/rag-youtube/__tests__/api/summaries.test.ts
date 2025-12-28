import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "@/app/api/summaries/route";
import { getSession } from "@repo/neon-auth";
import { database } from "@repo/prisma-neon";

// Mock the dependencies
vi.mock("@repo/neon-auth");
vi.mock("@repo/prisma-neon");

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
    expect(data).toEqual({ error: "Unauthorized" });
  });

  it("should return summaries for authenticated user", async () => {
    const mockUser = { id: "user-123", email: "test@example.com" };
    const mockNotes = [
      {
        id: "note-1",
        sourceId: "source-1",
        summaryMd: "# Summary 1",
        createdAt: new Date("2024-01-01"),
        source: { title: "Source 1" },
      },
      {
        id: "note-2",
        sourceId: "source-2",
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
    expect(data.summaries[0]).toEqual({
      id: "note-1",
      sourceId: "source-1",
      title: "Source 1",
      createdAt: mockNotes[0].createdAt,
      summary: "# Summary 1",
    });
    expect(data.summaries[1].title).toBe("Untitled source");
    expect(database.note.findMany).toHaveBeenCalledWith({
      where: { ownerId: mockUser.id },
      include: { source: true },
      orderBy: { createdAt: "desc" },
    });
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
    expect(data).toEqual({ error: "Failed to fetch summaries" });
  });
});

