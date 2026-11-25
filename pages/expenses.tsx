import { useMemo, useState } from "react";
import { action } from "@void/react";
import { Plus, Search, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EXPENSE_CATEGORIES, formatYen, getTodayIso } from "@/lib/expenses";
import type { Props } from "./expenses.server";

export default function ExpensesPage({ expenses }: Props) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("すべて");
  const [pendingId, setPendingId] = useState<number | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [formCategory, setFormCategory] = useState<string>(EXPENSE_CATEGORIES[0]);
  const [spentAt, setSpentAt] = useState(getTodayIso());
  const [note, setNote] = useState("");
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return expenses.filter((item) => {
      const matchCat = category === "すべて" || item.category === category;
      const matchQuery =
        !q ||
        item.title.toLowerCase().includes(q) ||
        item.note.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q);
      return matchCat && matchQuery;
    });
  }, [expenses, query, category]);

  const totalAmount = useMemo(
    () => filtered.reduce((sum, item) => sum + item.amount, 0),
    [filtered],
  );

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const trimmedTitle = title.trim();
    const numericAmount = Number(amount);
    if (!trimmedTitle) {
      setFormError("内容を入力してください。");
      return;
    }
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setFormError("金額は1円以上の数値で入力してください。");
      return;
    }

    setCreating(true);
    try {
      const res = await action("/expenses?create", {
        data: {
          title: trimmedTitle,
          amount: Math.round(numericAmount),
          category: formCategory,
          spentAt: spentAt || getTodayIso(),
          note: note.trim(),
        },
      });
      if (!res.ok) {
        setFormError(res.error.message);
        return;
      }
      setTitle("");
      setAmount("");
      setNote("");
      setDialogOpen(false);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: number) => {
    setPendingId(id);
    try {
      await action("/expenses?delete", { data: { id } });
    } finally {
      setPendingId(null);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">支出一覧</h1>
        </div>
        <div className="flex items-end justify-between gap-4 sm:justify-end">
          <div className="text-right">
            <p className="text-muted-foreground text-xs">表示中の合計（{filtered.length}件）</p>
            <p className="text-xl font-bold tabular-nums">{formatYen(totalAmount)}</p>
          </div>
          <Dialog
            open={dialogOpen}
            onOpenChange={(open) => {
              setDialogOpen(open);
              if (open) setFormError(null);
            }}
          >
            <DialogTrigger asChild>
              <Button type="button">
                <Plus className="size-4" />
                支出を追加
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>支出を追加</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="exp-title">内容</Label>
                  <Input
                    id="exp-title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="例：ランチ、電車賃"
                    required
                  />
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="exp-amount">金額 (円)</Label>
                    <Input
                      id="exp-amount"
                      type="number"
                      inputMode="numeric"
                      min={1}
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="1000"
                      className="text-right tabular-nums"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="exp-category">カテゴリ</Label>
                    <Select value={formCategory} onValueChange={setFormCategory}>
                      <SelectTrigger id="exp-category">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {EXPENSE_CATEGORIES.map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            {cat}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="exp-date">日付</Label>
                    <Input
                      id="exp-date"
                      type="date"
                      value={spentAt}
                      onChange={(e) => setSpentAt(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="exp-note">メモ（任意）</Label>
                    <Input
                      id="exp-note"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="お店の名前など"
                    />
                  </div>
                </div>

                {formError && <p className="text-destructive text-xs font-medium">{formError}</p>}

                <DialogFooter>
                  <DialogClose asChild>
                    <Button type="button" variant="outline">
                      キャンセル
                    </Button>
                  </DialogClose>
                  <Button type="submit" disabled={creating}>
                    <Plus className="size-4" />
                    追加する
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader className="gap-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 sm:max-w-xs">
              <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="内容・メモで検索..."
                className="pl-9"
              />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {["すべて", ...EXPENSE_CATEGORIES].map((cat) => (
                <Button
                  key={cat}
                  type="button"
                  size="sm"
                  variant={category === cat ? "default" : "outline"}
                  onClick={() => setCategory(cat)}
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
          {filtered.length === 0 ? (
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
                {filtered.map((item) => (
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
                        onClick={() => handleDelete(item.id)}
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
    </div>
  );
}
