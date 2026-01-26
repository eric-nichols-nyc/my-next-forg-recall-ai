import { neonAuth } from "@neondatabase/neon-js/auth/next";
import { SidebarFooter } from "@repo/design-system/components/ui/sidebar";
import {
  FileText,
  Infinity as InfinityIcon,
  LayoutDashboard,
} from "lucide-react";
import { redirect } from "next/navigation";
import {
  DashboardLayout,
  DashboardSidebarHeader,
} from "@/components/dashboard-layout";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { session } = await neonAuth();

  if (!session) {
    redirect("/auth/sign-in");
  }

  const navItems = [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: <LayoutDashboard />,
    },
    {
      title: "Transcripts",
      url: "/transcript",
      icon: <FileText />,
    },
  ];

  return (
    <DashboardLayout
      navigationItems={navItems}
      sidebarFooter={
        <SidebarFooter>
          <div className="flex items-center gap-3 px-2">
            <div className="flex size-10 items-center justify-center rounded-full bg-teal-500 font-semibold text-white">
              E
            </div>
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="truncate font-medium">Eric Nichols</span>
              <span className="text-muted-foreground text-xs">Basic</span>
            </div>
          </div>
        </SidebarFooter>
      }
      sidebarHeader={
        <DashboardSidebarHeader
          href="/dashboard"
          logo={
            <div className="flex items-center justify-center">
              <InfinityIcon className="size-5" />
            </div>
          }
          title="LinkLearn"
        />
      }
    >
      {children}
    </DashboardLayout>
  );
}
