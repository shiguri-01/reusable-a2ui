import { Skeleton } from "@/components/ui/skeleton";

export function InlineA2UISkeleton() {
  return (
    <Skeleton role="status" className="h-24 w-full rounded-xl motion-reduce:animate-none">
      <span className="sr-only">UI を作成中</span>
    </Skeleton>
  );
}
