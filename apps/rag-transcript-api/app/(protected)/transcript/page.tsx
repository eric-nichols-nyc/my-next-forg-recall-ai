import { SplitLayout } from "../../../components/split-layout";
import { TranscriptContent } from "./_components/transcript-content";
import { getUserTranscripts } from "./actions";

export default async function TranscriptPage() {
  const transcripts = await getUserTranscripts();
  console.log("User transcripts:", transcripts);

  return (
    <div className="h-screen">
      <SplitLayout
        left={<TranscriptContent transcripts={transcripts} />}
        right={
          <div className="flex h-full flex-col gap-6 overflow-y-auto border-l bg-muted/50 p-6">
            <div className="space-y-4">
              <div>
                <h2 className="font-semibold text-lg">How it works</h2>
                <p className="text-muted-foreground text-sm">
                  Submit a YouTube video URL to extract its transcript and
                  generate notes automatically.
                </p>
              </div>
              <div className="space-y-3">
                <div className="rounded-lg border bg-card p-4">
                  <h3 className="font-semibold">1. Submit URL</h3>
                  <p className="text-muted-foreground text-sm">
                    Enter a YouTube video URL or video ID
                  </p>
                </div>
                <div className="rounded-lg border bg-card p-4">
                  <h3 className="font-semibold">2. Processing</h3>
                  <p className="text-muted-foreground text-sm">
                    The transcript is being processed in the background
                  </p>
                </div>
                <div className="rounded-lg border bg-card p-4">
                  <h3 className="font-semibold">3. Ready</h3>
                  <p className="text-muted-foreground text-sm">
                    View your notes once the transcript is ready
                  </p>
                </div>
              </div>
            </div>
          </div>
        }
      />
    </div>
  );
}
