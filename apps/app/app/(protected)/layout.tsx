import { neonAuth } from "@neondatabase/neon-js/auth/next";
import { redirect } from "next/navigation";
import { LayoutDashboard, FileText, Settings, User } from "lucide-react";
import {
  DashboardLayout,
  DashboardSidebarHeader,
} from "@repo/design-system";
import { ModeToggle } from "@repo/design-system/components/mode-toggle";
import { UserButton } from "@neondatabase/neon-js/auth/react/ui";
import {
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
} from "@repo/design-system/components/ui/sidebar";

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
      title: "Notes",
      url: "/notes",
      icon: <FileText />,
    },
  ];

  const accountItems = [
    {
      title: "Account",
      url: "/account/settings",
      icon: <Settings />,
    },
  ];

  return (
    <DashboardLayout
      sidebarHeader={
        <DashboardSidebarHeader
          logo={
            <div className="bg-primary text-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
              <User className="size-4" />
            </div>
          }
          title="Recall AI"
          subtitle="Learning Platform"
          href="/dashboard"
        />
      }
      navigationItems={navItems}
      accountItems={accountItems}
      sidebarFooter={
        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <div className="flex items-center justify-between w-full px-2">
                <UserButton size="icon" />
              </div>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      }
      headerActions={<ModeToggle />}
    >
      {children}
    </DashboardLayout>
  );
}
