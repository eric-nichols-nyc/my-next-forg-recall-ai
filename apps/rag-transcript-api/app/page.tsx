// import { neonAuth } from "@neondatabase/neon-js/auth/next";
// import { Button } from "@repo/design-system/components/ui/button";
// import {
//   Card,
//   CardContent,
//   CardDescription,
//   CardHeader,
//   CardTitle,
// } from "@repo/design-system/components/ui/card";
// import { Database } from "lucide-react";
// import Link from "next/link";
import { SplitLayout } from "../components/split-layout";
import { YouTubeTranscriptViewer } from "./_components/youtube-transcript-viewer";

const HomePage = async () => {
  // const { session } = await neonAuth();
  // const isLoggedIn = !!session;

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

  // Original content (commented out):
  // return (
  //   <main className="flex min-h-screen items-center justify-center bg-background p-8">
  //     <Card className="w-full max-w-md">
  //       <CardHeader className="text-center">
  //         <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
  //           <Database className="h-6 w-6 text-primary" />
  //         </div>
  //         <CardTitle className="text-2xl">Neon Auth</CardTitle>
  //         <CardDescription>
  //           Authentication demo with Neon database
  //         </CardDescription>
  //       </CardHeader>
  //       <CardContent className="flex flex-col gap-4">
  //         <p className="text-center text-muted-foreground text-sm">
  //           This app demonstrates authentication with Neon database integration.
  //         </p>
  //         <Button asChild className="w-full">
  //           <Link href={isLoggedIn ? "/transcript" : "/auth/sign-in"}>
  //             {isLoggedIn ? "Get Started" : "Sign In"}
  //           </Link>
  //         </Button>
  //       </CardContent>
  //     </Card>
  //   </main>
  // );
};

export default HomePage;
