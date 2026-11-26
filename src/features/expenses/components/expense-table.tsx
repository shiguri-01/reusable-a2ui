import { useState } from "react";
import { Toggle, ToggleGroup } from "@ui-sdk/react/toggle";
import { Search, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { ALL_CATEGORY_LABEL, EXPENSE_CATEGORIES, formatYen, type ExpenseItem } from "../model";

interface ExpenseTableProps {
  expenses: ExpenseItem[];
  query: string;
  category: string;
  pendingId: number | null;
  onQueryChange: (query: string) => void;
  onCategoryChange: (category: string) => void;
  onDelete: (id: number) => void;
}

export function ExpenseTable({
  expenses,
  query,
  category,
  pendingId,
  onQueryChange,
  onCategoryChange,
  onDelete,
}: ExpenseTableProps) {
  const [deleteTarget, setDeleteTarget] = useState<ExpenseItem | null>(null);
  const hasFilters = query.trim().length > 0 || category !== ALL_CATEGORY_LABEL;

  return (
    <>
      <Card>
        <CardHeader className="gap-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 sm:max-w-xs">
              <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
              <Input
                value={query}
                onChange={(e) => onQueryChange(e.target.value)}
                placeholder="内容・メモで検索..."
                className="pl-9"
              />
            </div>
            <ToggleGroup
              value={[category]}
              deselectable={false}
              aria-label="カテゴリで絞り込み"
              onValueChange={(next) => {
                if (next[0]) onCategoryChange(next[0]);
              }}
              className="flex flex-wrap gap-1.5"
            >
              {[ALL_CATEGORY_LABEL, ...EXPENSE_CATEGORIES].map((cat) => (
                <Toggle
                  key={cat}
                  value={cat}
                  className={cn(
                    buttonVariants({ variant: "outline", size: "sm" }),
                    "data-pressed:bg-primary data-pressed:text-primary-foreground data-pressed:border-primary data-pressed:hover:bg-primary/90",
                  )}
                >
                  {cat}
                </Toggle>
              ))}
            </ToggleGroup>
          </div>
          <CardTitle className="sr-only">支出テーブル</CardTitle>
          <CardDescription className="sr-only">登録済みの支出ログ一覧</CardDescription>
        </CardHeader>

        <CardContent>
          {expenses.length === 0 ? (
            <Empty className="py-10">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Search />
                </EmptyMedia>
                <EmptyTitle className="text-base">一致する支出ログがありません</EmptyTitle>
                <EmptyDescription>
                  {hasFilters
                    ? "検索キーワードやカテゴリの絞り込みを変更するか、条件をリセットしてください。"
                    : "まだ支出ログが登録されていません。"}
                </EmptyDescription>
              </EmptyHeader>
              {hasFilters && (
                <EmptyContent>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      onQueryChange("");
                      onCategoryChange(ALL_CATEGORY_LABEL);
                    }}
                  >
                    検索条件をクリア
                  </Button>
                </EmptyContent>
              )}
            </Empty>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>日付</TableHead>
                  <TableHead>内容</TableHead>
                  <TableHead>カテゴリ</TableHead>
                  <TableHead>メモ</TableHead>
                  <TableHead className="text-right">金額</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="text-muted-foreground tabular-nums">
                      {item.spentAt}
                    </TableCell>
                    <TableCell className="font-medium">{item.title}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{item.category}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground max-w-xs truncate">
                      {item.note || "—"}
                    </TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">
                      {formatYen(item.amount)}
                    </TableCell>
                    <TableCell>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-destructive size-8"
                        disabled={pendingId === item.id}
                        aria-label={`${item.title}を削除`}
                        onClick={() => setDeleteTarget(item)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>支出を削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget
                ? `「${deleteTarget.title}」（${formatYen(deleteTarget.amount)}）を削除します。この操作は取り消せません。`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              className={buttonVariants({ variant: "destructive" })}
              onClick={() => {
                if (deleteTarget) {
                  onDelete(deleteTarget.id);
                  setDeleteTarget(null);
                }
              }}
            >
              削除する
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
