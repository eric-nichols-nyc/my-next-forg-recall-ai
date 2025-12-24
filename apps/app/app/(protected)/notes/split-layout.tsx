"use client"

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@repo/design-system/components/ui/resizable";

type SplitLayoutProps = {
  left: React.ReactNode
  right: React.ReactNode
}

export function SplitLayout({ left, right }: SplitLayoutProps) {
  return (
    <ResizablePanelGroup direction="horizontal" className="h-full">
      <ResizablePanel defaultSize={60} minSize={30}>
        {left}
      </ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel defaultSize={40} minSize={20}>
        {right}
      </ResizablePanel>
    </ResizablePanelGroup>
  )
}

