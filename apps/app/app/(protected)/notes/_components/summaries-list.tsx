"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import { Spinner } from "@repo/design-system/components/ui/spinner";
import { useEffect, useState } from "react";
import { SummaryItem } from "./summary-item";

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
        setError(
          fetchError instanceof Error ? fetchError.message : "Unknown error"
        );
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
          <CardDescription>
            Sign in to view your saved summaries.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="h-full overflow-y-auto">
      <CardHeader>
        <CardTitle>Saved summaries</CardTitle>
        <CardDescription>
          Your recent summaries are listed below.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {(() => {
          if (isLoading) {
            return (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Spinner className="size-4" />
                <span>Loading summaries…</span>
              </div>
            );
          }
          if (error) {
            return <p className="text-destructive">Error: {error}</p>;
          }
          if (summaries.length === 0) {
            return <p className="text-muted-foreground">No summaries yet.</p>;
          }
          return (
            <ul className="space-y-4">
              {summaries.map((summary) => (
                <SummaryItem key={summary.id} summary={summary} />
              ))}
            </ul>
          );
        })()}
      </CardContent>
    </Card>
  );
}
