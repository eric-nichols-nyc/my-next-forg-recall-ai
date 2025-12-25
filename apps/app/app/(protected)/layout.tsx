import { neonAuth } from "@neondatabase/neon-js/auth/next";
import { Button } from "@repo/design-system/components/ui/button";
import { SidebarFooter } from "@repo/design-system/components/ui/sidebar";
import {
  ArrowUp,
  FileText,
  Folder,
  Infinity as InfinityIcon,
  LayoutDashboard,
  MessageSquare,
  Settings,
  Star,
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
      title: "Folders",
      url: "/folders",
      icon: <Folder />,
    },
    {
      title: "Notes",
      url: "/notes",
      icon: <FileText />,
    },
    {
      title: "Focus",
      url: "/focus",
      icon: <Star />,
    },
    {
      title: "Chat",
      url: "/chat",
      icon: <MessageSquare />,
    },
    {
      title: "Settings",
      url: "/settings",
      icon: <Settings />,
    },
  ];

  return (
    <DashboardLayout
      navigationItems={navItems}
      sidebarFooter={
        <SidebarFooter className="space-y-4">
          <Button className="w-full bg-purple-600 text-white hover:bg-purple-700">
            <ArrowUp className="mr-2 size-4" />
            Upgrade to Premium
          </Button>
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
