import type { CSSProperties, ReactNode } from "react";
import { Link } from "@void/react";
import { Layers, ReceiptText, Wallet } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AssistantSidebar } from "@/features/ai-chat/components/assistant-sidebar";
import { AssistantSidebarProvider } from "@/features/ai-chat/context/assistant-context";
import { useSidebarWidth } from "@/features/ai-chat/hooks/use-sidebar-width";
import "./style.css";

const navLinkClass =
  "text-muted-foreground hover:bg-accent hover:text-foreground data-void-active:bg-accent data-void-active:text-foreground inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium transition-colors";

export default function RootLayout({ children }: { children: ReactNode }) {
  const sidebarWidth = useSidebarWidth();

  return (
    <SidebarProvider
      defaultOpen
      className="bg-muted/30 flex min-h-screen flex-col"
      style={
        {
          "--sidebar-width": `${sidebarWidth}px`,
          "--sidebar-width-mobile": "24rem",
        } as CSSProperties
      }
    >
      <AssistantSidebarProvider>
        <header className="bg-background/95 supports-backdrop-filter:bg-background/80 sticky top-0 z-30 border-b backdrop-blur">
          <div className="flex h-14 items-center justify-between px-4 sm:px-6">
            <div className="flex items-center gap-3">
              <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
                <span className="bg-primary text-primary-foreground flex size-7 items-center justify-center rounded-md">
                  <Wallet className="size-4" />
                </span>
                <span>支出ログ</span>
              </Link>
              <Badge variant="secondary" className="hidden sm:inline-flex">
                A2UI Demo
              </Badge>
            </div>

            <nav className="flex items-center gap-1 text-sm">
              <Link href="/" className={navLinkClass}>
                <Layers className="size-4" />
                <span>ダッシュボード (A2UI)</span>
              </Link>
              <Link href="/expenses" className={navLinkClass}>
                <ReceiptText className="size-4" />
                <span>支出一覧</span>
              </Link>
            </nav>
          </div>
        </header>

        <div className="flex min-h-[calc(100svh-3.5rem)] w-full flex-1">
          <SidebarInset className="min-w-0 bg-transparent">{children}</SidebarInset>
          <AssistantSidebar />
        </div>
      </AssistantSidebarProvider>
    </SidebarProvider>
  );
}
