import { neonAuth } from "@neondatabase/neon-js/auth/next";
import { PdfSummaryUploader } from "@/components/pdf-summary-uploader";
import { SplitLayout } from "../../../components/split-layout";
import { SummariesList } from "./_components/summaries-list";

export default async function NotesPage() {
  const { user } = await neonAuth();

  return (
    <div className="h-screen">
      <SplitLayout
        left={ <PdfSummaryUploader />}
        right={
          <div className="flex h-full flex-col gap-6 overflow-y-auto border-l bg-muted/50 p-6">
            <SummariesList isAuthenticated={!!user} />
          </div>
        }
      />
    </div>
  );
}
