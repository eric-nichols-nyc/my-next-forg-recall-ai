import {
  NeonAuthUIProvider,
  UserButton,
} from "@neondatabase/neon-js/auth/react/ui";
import { ModeToggle } from "@repo/design-system/components/mode-toggle";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { authClient } from "@/lib/auth/client";
import "./styles.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "My Neon App",
  description: "A Next.js application with Neon Auth",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <NeonAuthUIProvider
          authClient={authClient}
          emailOTP
          redirectTo="/account/settings"
        >
          <header className="flex h-16 items-center justify-end gap-4 p-4">
            <ModeToggle />
            <UserButton size="icon" />
          </header>

          {children}
        </NeonAuthUIProvider>
      </body>
    </html>
  );
}

// import "./styles.css";
// import { fonts } from "@repo/design-system/lib/fonts";
// import { ThemeProvider } from "@repo/design-system/providers/theme";
// import type { ReactNode } from "react";
// import { AuthProvider } from "./provider";

// type RootLayoutProperties = {
//   readonly children: ReactNode;
// };

// const RootLayout = ({ children }: RootLayoutProperties) => (
//   <html className={fonts} lang="en" suppressHydrationWarning>
//     <body>
//       <ThemeProvider>
//         <AuthProvider> {children} </AuthProvider>
//       </ThemeProvider>
//     </body>
//   </html>
// );

// export default RootLayout;
