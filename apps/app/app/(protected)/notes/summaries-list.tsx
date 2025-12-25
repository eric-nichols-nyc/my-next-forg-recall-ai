"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import { Spinner } from "@repo/design-system/components/ui/spinner";

type Summary = {
  id: string;
  sourceId: string;
  title: string;
  createdAt: string;
  summary: string;
};

type SummariesListProps = {
  isAuthenticated: boolean;
};

function getPreview(text: string, length = 160) {
  const stripped = text.replace(/[#>*_`~-]/g, "").trim();
  if (stripped.length <= length) return stripped;
  return `${stripped.slice(0, length)}…`;
}

export function SummariesList({ isAuthenticated }: SummariesListProps) {
  const [summaries, setSummaries] = useState<Summary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      setIsLoading(false);
      return;
    }

    async function loadSummaries() {
      try {
        const response = await fetch("/api/summaries");
        if (!response.ok) {
          throw new Error("Failed to fetch summaries");
        }
        const data = await response.json();
        setSummaries(data.summaries ?? []);
      } catch (fetchError) {
        setError(fetchError instanceof Error ? fetchError.message : "Unknown error");
      } finally {
        setIsLoading(false);
      }
    }

    loadSummaries();
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Saved summaries</CardTitle>
          <CardDescription>Sign in to view your saved summaries.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="h-full overflow-y-auto">
      <CardHeader>
        <CardTitle>Saved summaries</CardTitle>
        <CardDescription>Your recent summaries are listed below.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Spinner className="size-4" />
            <span>Loading summaries…</span>
          </div>
        ) : error ? (
          <p className="text-destructive">Error: {error}</p>
        ) : summaries.length === 0 ? (
          <p className="text-muted-foreground">No summaries yet.</p>
        ) : (
          <ul className="space-y-3">
            {summaries.map((summary) => (
              <li key={summary.id} className="border-b pb-3 last:border-b-0 last:pb-0">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <Link
                      href={`/notes/${summary.sourceId}`}
                      className="font-semibold hover:underline"
                    >
                      {summary.title}
                    </Link>
                    <p className="text-muted-foreground text-sm">
                      {new Date(summary.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
                <p className="text-muted-foreground text-sm">
                  {getPreview(summary.summary)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
