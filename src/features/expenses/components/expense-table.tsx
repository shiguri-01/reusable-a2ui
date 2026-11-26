import { Search, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  return (
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
          <div className="flex flex-wrap gap-1.5">
            {[ALL_CATEGORY_LABEL, ...EXPENSE_CATEGORIES].map((cat) => (
              <Button
                key={cat}
                type="button"
                size="sm"
                variant={category === cat ? "default" : "outline"}
                onClick={() => onCategoryChange(cat)}
              >
                {cat}
              </Button>
            ))}
          </div>
        </div>
        <CardTitle className="sr-only">支出テーブル</CardTitle>
        <CardDescription className="sr-only">登録済みの支出ログ一覧</CardDescription>
      </CardHeader>

      <CardContent>
        {expenses.length === 0 ? (
          <div className="text-muted-foreground py-12 text-center text-sm">
            条件に一致する支出ログがありません。
          </div>
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
                      onClick={() => onDelete(item.id)}
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
  );
}
