import { neonAuth } from "@neondatabase/neon-js/auth/next";
import { SplitLayout } from "../../../components/split-layout";
import { YouTubeTranscriptViewer } from "./_components/youtube-transcript-viewer";

export default async function NotesPage() {
  const { user } = await neonAuth();

  return (
    <div className="h-screen">
      <SplitLayout
        left={
          <div className="flex h-full flex-col p-6">
            <YouTubeTranscriptViewer />
          </div>
        }
        right={
          <div className="flex h-full flex-col gap-6 overflow-y-auto border-l bg-muted/50 p-6">
            <div className="space-y-4">
              <h2 className="font-semibold text-lg">Instructions</h2>
              <div className="space-y-2 text-muted-foreground text-sm">
                <p>
                  Enter a YouTube video URL or video ID to fetch and display the
                  transcript.
                </p>
                <p>
                  The transcript will appear in the left panel after fetching.
                </p>
              </div>
            </div>
          </div>
        }
      />
    </div>
  );
}
