import { useEffect } from "react";
import { useForm } from "@tanstack/react-form";
import { Check } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const saveVersionFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "バージョン名を入力してください")
    .max(80, "80文字以内で入力してください"),
  description: z.string().max(240, "240文字以内で入力してください"),
});

interface SaveVersionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultName: string;
  defaultDescription: string;
  pending: boolean;
  serverError: string | null;
  onSubmit: (values: { name: string; description: string }) => Promise<boolean>;
}

export function SaveVersionDialog({
  open,
  onOpenChange,
  defaultName,
  defaultDescription,
  pending,
  serverError,
  onSubmit,
}: SaveVersionDialogProps) {
  const form = useForm({
    defaultValues: {
      name: defaultName,
      description: defaultDescription,
    },
    validators: {
      onChange: saveVersionFormSchema,
    },
    onSubmit: async ({ value }) => {
      const ok = await onSubmit({
        name: value.name.trim(),
        description: value.description.trim(),
      });
      if (ok) {
        onOpenChange(false);
      }
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        name: defaultName,
        description: defaultDescription,
      });
    }
  }, [open, defaultName, defaultDescription, form]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">カスタマイズを新バージョンとして保存</DialogTitle>
          <DialogDescription className="text-xs">
            保存すると新しいUIバージョンとして履歴に追加され、すぐにダッシュボードへ適用されます。
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            void form.handleSubmit();
          }}
          className="space-y-4"
        >
          <form.Field name="name">
            {(field) => (
              <Field data-invalid={field.state.meta.errors.length > 0}>
                <FieldLabel htmlFor="save-version-name" className="text-xs">
                  バージョン名
                </FieldLabel>
                <Input
                  id="save-version-name"
                  autoFocus
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="例：v4：2カラム予算重視レイアウト"
                />
                <FieldError errors={field.state.meta.errors} />
              </Field>
            )}
          </form.Field>

          <form.Field name="description">
            {(field) => (
              <Field data-invalid={field.state.meta.errors.length > 0}>
                <FieldLabel htmlFor="save-version-desc" className="text-xs">
                  変更メモ（任意）
                </FieldLabel>
                <Textarea
                  id="save-version-desc"
                  rows={2}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="工夫した点やレイアウトの特徴など"
                  className="text-xs"
                />
                <FieldError errors={field.state.meta.errors} />
              </Field>
            )}
          </form.Field>

          {serverError && <p className="text-destructive text-xs font-medium">{serverError}</p>}

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={pending}
              onClick={() => onOpenChange(false)}
            >
              キャンセル
            </Button>
            <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
              {([canSubmit, isSubmitting]) => (
                <Button
                  type="submit"
                  size="sm"
                  disabled={!canSubmit || pending || Boolean(isSubmitting)}
                >
                  <Check className="size-4" />
                  保存して適用
                </Button>
              )}
            </form.Subscribe>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
