"use client";

import * as React from "react";

import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@repo/design-system/components/ui/sidebar";
import { Separator } from "@repo/design-system/components/ui/separator";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@repo/design-system/components/ui/breadcrumb";
import {
  AppSidebar,
  type AppSidebarProps,
} from "@repo/design-system/components/layouts/app-sidebar";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface DashboardLayoutProps {
  children: React.ReactNode;
  /** Props passed to AppSidebar */
  sidebarProps?: AppSidebarProps;
  /** Default sidebar open state */
  defaultOpen?: boolean;
  /** Breadcrumb items to display in the header */
  breadcrumbs?: BreadcrumbItem[];
  /** Custom header content (rendered after breadcrumbs) */
  headerContent?: React.ReactNode;
  /** Custom sidebar component (replaces default AppSidebar) */
  sidebar?: React.ReactNode;
}

export function DashboardLayout({
  children,
  sidebarProps,
  defaultOpen = true,
  breadcrumbs = [],
  headerContent,
  sidebar,
}: DashboardLayoutProps) {
  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      {sidebar ?? <AppSidebar {...sidebarProps} />}
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="mr-2 data-[orientation=vertical]:h-4"
            />
            {breadcrumbs.length > 0 && (
              <Breadcrumb>
                <BreadcrumbList>
                  {breadcrumbs.map((item, index) => {
                    const isLast = index === breadcrumbs.length - 1;
                    return (
                      <React.Fragment key={item.label}>
                        <BreadcrumbItem
                          className={isLast ? "" : "hidden md:block"}
                        >
                          {isLast ? (
                            <BreadcrumbPage>{item.label}</BreadcrumbPage>
                          ) : (
                            <BreadcrumbLink href={item.href ?? "#"}>
                              {item.label}
                            </BreadcrumbLink>
                          )}
                        </BreadcrumbItem>
                        {!isLast && (
                          <BreadcrumbSeparator className="hidden md:block" />
                        )}
                      </React.Fragment>
                    );
                  })}
                </BreadcrumbList>
              </Breadcrumb>
            )}
            {headerContent}
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
