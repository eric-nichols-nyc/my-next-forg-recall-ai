"use client";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
} from "@repo/design-system/components/ui/sidebar";
import Link from "next/link";
import type * as React from "react";

export type NavigationItem = {
  title: string;
  url: string;
  icon: React.ReactNode;
  badge?: string | number;
};

export type DashboardLayoutProps = {
  children: React.ReactNode;
  sidebarHeader?: React.ReactNode;
  navigationItems?: NavigationItem[];
  accountItems?: NavigationItem[];
  sidebarFooter?: React.ReactNode;
  headerActions?: React.ReactNode;
  headerTitle?: string;
  className?: string;
  defaultSidebarOpen?: boolean;
  onSidebarOpenChange?: (open: boolean) => void;
};

export function DashboardLayout({
  children,
  sidebarHeader,
  navigationItems = [],
  accountItems = [],
  sidebarFooter,
  headerActions,
  headerTitle,
  className,
  defaultSidebarOpen = true,
  onSidebarOpenChange,
}: DashboardLayoutProps) {
  return (
    <SidebarProvider
      defaultOpen={defaultSidebarOpen}
      onOpenChange={onSidebarOpenChange}
    >
      <Sidebar collapsible="icon">
        {sidebarHeader ? <SidebarHeader>{sidebarHeader}</SidebarHeader> : null}
        <SidebarContent>
          {navigationItems.length > 0 && (
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navigationItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild tooltip={item.title}>
                        <Link href={item.url}>
                          {item.icon}
                          <span>{item.title}</span>
                          {item.badge !== undefined && item.badge !== null ? (
                            <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs">
                              {item.badge}
                            </span>
                          ) : null}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          )}
          {accountItems.length > 0 && (
            <>
              <SidebarSeparator />
              <SidebarGroup>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {accountItems.map((item) => (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton asChild tooltip={item.title}>
                          <Link href={item.url}>
                            {item.icon}
                            <span>{item.title}</span>
                            {item.badge !== undefined && item.badge !== null ? (
                              <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs">
                                {item.badge}
                              </span>
                            ) : null}
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            </>
          )}
        </SidebarContent>
        {sidebarFooter ? <SidebarFooter>{sidebarFooter}</SidebarFooter> : null}
        <SidebarRail />
      </Sidebar>
      <SidebarInset className="flex flex-col">
        {headerTitle || headerActions ? (
          <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
            {headerTitle ? (
              <h1 className="font-semibold text-lg">{headerTitle}</h1>
            ) : null}
            <div className="flex-1" />
            {headerActions ? headerActions : null}
          </header>
        ) : null}
        <div className={`flex flex-1 flex-col ${className || ""}`}>
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

export type DashboardSidebarHeaderProps = {
  logo?: React.ReactNode;
  title: string;
  subtitle?: string;
  href?: string;
  className?: string;
  showToggle?: boolean;
};

export function DashboardSidebarHeader({
  logo,
  title,
  subtitle,
  href = "/",
  className,
  showToggle = true,
}: DashboardSidebarHeaderProps) {
  return (
    <SidebarHeader className={className}>
      <div className="flex w-full items-center justify-between gap-2">
        <SidebarMenu className="flex-1">
          <SidebarMenuItem>
            <SidebarMenuButton asChild className="flex-1" size="lg">
              <Link href={href}>
                {logo || (
                  <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                    <span className="font-semibold text-sm">
                      {title.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">{title}</span>
                  {subtitle ? (
                    <span className="truncate text-xs">{subtitle}</span>
                  ) : null}
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        {showToggle ? <SidebarTrigger className="shrink-0" /> : null}
      </div>
    </SidebarHeader>
  );
}
