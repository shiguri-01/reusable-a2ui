import { Link } from "@void/react";
import { Layers, ReceiptText, Wallet } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import "./style.css";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-muted/30 min-h-screen">
      <header className="bg-background/95 supports-backdrop-filter:bg-background/80 sticky top-0 z-30 border-b backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
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
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">{children}</main>
    </div>
  );
}
