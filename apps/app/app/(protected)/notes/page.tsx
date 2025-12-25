import { neonAuth } from "@neondatabase/neon-js/auth/next";
import { Chat } from "@/components/chat";
import { PdfSummaryUploader } from "@/components/pdf-summary-uploader";
import { NotesContent } from "./notes-content";
import { SplitLayout } from "./split-layout";

export default async function ServerRenderedPage() {
  const { session, user } = await neonAuth();

  return (
    <div className="h-screen">
      <SplitLayout
        left={<NotesContent session={session} user={user} />}
        right={
          <div className="flex h-full flex-col gap-6 overflow-y-auto border-l bg-muted/50 p-6">
            <PdfSummaryUploader />
            <Chat />
          </div>
        }
      />
    </div>
  );
}
