"use client";

import { Streamdown } from "streamdown";

type NoteData = {
  id: string;
  sourceId: string;
  title: string;
  summaryMd: string;
  createdAt: Date | string;
};

type NotesContentProps = {
  session: unknown;
  user: { id: string } | null;
  note?: NoteData;
};

export function NotesContent({ session, user, note }: NotesContentProps) {
  return (
    <div className="flex h-full flex-col bg-neutral-900">
      <div className="flex-1 overflow-y-auto">
        {note ? (
          <div className="mx-auto max-w-4xl space-y-8 p-8">
            <div className="space-y-3 border-border border-b pb-6">
              <h1 className="font-bold text-3xl tracking-tight">
                {note.title}
              </h1>
              <p className="text-muted-foreground text-sm">
                {new Date(note.createdAt).toLocaleString()}
              </p>
            </div>
            <div className="prose prose-lg dark:prose-invert max-w-none">
              <Streamdown>{note.summaryMd}</Streamdown>
            </div>
          </div>
        ) : (
          <div className="flex-1 space-y-4 overflow-y-auto p-6">
            <h1 className="font-semibold text-2xl">Server Rendered Page</h1>

            <p className="text-gray-400">
              Authenticated:{" "}
              <span className={session ? "text-green-500" : "text-red-500"}>
                {session ? "Yes" : "No"}
              </span>
            </p>

            {user ? <p className="text-gray-400">User ID: {user.id}</p> : null}

            <p className="font-medium text-gray-700 dark:text-gray-200">
              Session and User Data:
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
