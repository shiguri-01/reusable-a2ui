import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { Link, useRouter } from "@void/react";
import { Layers, PanelRight, ReceiptText, Wallet } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { SidebarProvider, useSidebar } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import "./style.css";

export const DEFAULT_SIDEBAR_WIDTH = 448;
export const MIN_SIDEBAR_WIDTH = 320;
export const MAX_SIDEBAR_WIDTH = 720;
export const SIDEBAR_WIDTH_STORAGE_KEY = "reusable-a2ui:sidebar-width:v1";

function HeaderSidebarToggle() {
  const { open, openMobile, isMobile, toggleSidebar } = useSidebar();
  const isOpen = isMobile ? openMobile : open;

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className={cn(
        "gap-1.5 text-xs",
        isOpen ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground",
      )}
      aria-label={isOpen ? "AI アシスタントを閉じる" : "AI アシスタントを開く"}
      aria-expanded={isOpen}
      title="AI アシスタントを開閉 (Ctrl+B)"
      onClick={toggleSidebar}
    >
      <PanelRight className="size-4" />
      <span className="hidden sm:inline">AI アシスタント</span>
    </Button>
  );
}

export default function RootLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const isDashboard = router.path === "/";
  const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_SIDEBAR_WIDTH);

  useEffect(() => {
    const raw = window.localStorage.getItem(SIDEBAR_WIDTH_STORAGE_KEY);
    if (!raw) return;
    const parsed = Number(raw);
    if (Number.isFinite(parsed) && parsed >= MIN_SIDEBAR_WIDTH && parsed <= MAX_SIDEBAR_WIDTH) {
      setSidebarWidth(parsed);
    }
  }, []);

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

          <div className="flex items-center gap-2">
            <nav className="flex items-center gap-1 text-sm">
              <Link
                href="/"
                className="text-muted-foreground hover:bg-accent hover:text-foreground data-void-active:bg-accent data-void-active:text-foreground inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium transition-colors"
              >
                <Layers className="size-4" />
                <span>ダッシュボード (A2UI)</span>
              </Link>
              <Link
                href="/expenses"
                className="text-muted-foreground hover:bg-accent hover:text-foreground data-void-active:bg-accent data-void-active:text-foreground inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium transition-colors"
              >
                <ReceiptText className="size-4" />
                <span>支出一覧</span>
              </Link>
            </nav>

            {isDashboard && (
              <>
                <Separator orientation="vertical" className="h-5" />
                <HeaderSidebarToggle />
              </>
            )}
          </div>
        </div>
      </header>

      {isDashboard ? (
        <div className="flex min-h-[calc(100svh-3.5rem)] w-full flex-1">{children}</div>
      ) : (
        <main className="flex-1">{children}</main>
      )}
    </SidebarProvider>
  );
}
