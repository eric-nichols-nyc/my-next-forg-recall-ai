import { neonAuth } from "@neondatabase/neon-js/auth/next";
import { Chat } from "@/components/chat";
import { NotesContent } from "./notes-content";
import { SplitLayout } from "./split-layout";

export default async function ServerRenderedPage() {
  const { session, user } = await neonAuth();

  return (
    <div className="h-screen">
      <SplitLayout
        left={<NotesContent session={session} user={user} />}
        right={
          <div className="h-full border-l bg-muted/50 p-6">
            <Chat />
          </div>
        }
      />
    </div>
  );
}
