import { useState } from "react";
import { action } from "@void/react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { EXPENSE_CATEGORIES, getTodayIso } from "../model";

export function ExpenseCreateDialog() {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<string>(EXPENSE_CATEGORIES[0]);
  const [spentAt, setSpentAt] = useState(getTodayIso());
  const [note, setNote] = useState("");
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

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
          category,
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
      setOpen(false);
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (nextOpen) setFormError(null);
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
              <Select value={category} onValueChange={setCategory}>
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
  );
}
