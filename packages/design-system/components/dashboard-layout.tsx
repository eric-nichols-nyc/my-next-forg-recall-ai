"use client"

import * as React from "react"
import Link from "next/link"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
} from "./ui/sidebar"
import { ModeToggle } from "./mode-toggle"

export type NavigationItem = {
  title: string
  url: string
  icon: React.ReactNode
  badge?: string | number
}

export type DashboardLayoutProps = {
  children: React.ReactNode
  sidebarHeader?: React.ReactNode
  navigationItems?: NavigationItem[]
  accountItems?: NavigationItem[]
  sidebarFooter?: React.ReactNode
  headerActions?: React.ReactNode
  headerTitle?: string
  className?: string
  defaultSidebarOpen?: boolean
  onSidebarOpenChange?: (open: boolean) => void
}

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
      <Sidebar>
        {sidebarHeader && <SidebarHeader>{sidebarHeader}</SidebarHeader>}
        <SidebarContent>
          {navigationItems.length > 0 && (
            <>
              <SidebarGroup>
                <SidebarGroupLabel>Navigation</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {navigationItems.map((item) => (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton asChild tooltip={item.title}>
                          <Link href={item.url}>
                            {item.icon}
                            <span>{item.title}</span>
                            {item.badge && (
                              <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                                {item.badge}
                              </span>
                            )}
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
              {accountItems.length > 0 && <SidebarSeparator />}
            </>
          )}
          {accountItems.length > 0 && (
            <SidebarGroup>
              <SidebarGroupLabel>Account</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {accountItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild tooltip={item.title}>
                        <Link href={item.url}>
                          {item.icon}
                          <span>{item.title}</span>
                          {item.badge && (
                            <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                              {item.badge}
                            </span>
                          )}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          )}
        </SidebarContent>
        {sidebarFooter && <SidebarFooter>{sidebarFooter}</SidebarFooter>}
        <SidebarRail />
      </Sidebar>
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          {headerTitle && (
            <h1 className="text-lg font-semibold">{headerTitle}</h1>
          )}
          <div className="flex-1" />
          {headerActions}
        </header>
        <div className={`flex flex-1 flex-col gap-4 p-4 pt-0 ${className || ""}`}>
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

export type DashboardSidebarHeaderProps = {
  logo?: React.ReactNode
  title: string
  subtitle?: string
  href?: string
  className?: string
}

export function DashboardSidebarHeader({
  logo,
  title,
  subtitle,
  href = "/",
  className,
}: DashboardSidebarHeaderProps) {
  return (
    <SidebarHeader className={className}>
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton asChild size="lg">
            <Link href={href}>
              {logo || (
                <div className="bg-primary text-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                  <span className="text-sm font-semibold">
                    {title.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">{title}</span>
                {subtitle && (
                  <span className="truncate text-xs">{subtitle}</span>
                )}
              </div>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarHeader>
  )
}

