import { getUserTranscripts } from "@/actions/get-user-transcripts.action";
import { TranscriptContent } from "./_components/transcript-content";

export default async function TranscriptPage() {
  const transcripts = await getUserTranscripts();
  console.log("User transcripts:", transcripts);

  return (
    <div className="h-screen">
      <TranscriptContent transcripts={transcripts} />
    </div>
  );
}
