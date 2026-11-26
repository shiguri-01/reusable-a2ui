import { DashboardView } from "@/features/dashboard/components/dashboard-view";
import type { Props } from "./index.server";

export default function DashboardPage({ expenses, uiVersions, activeVersionId }: Props) {
  return (
    <DashboardView expenses={expenses} uiVersions={uiVersions} activeVersionId={activeVersionId} />
  );
}
