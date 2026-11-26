import { ExpensesView } from "@/features/expenses/components/expenses-view";
import type { Props } from "./expenses.server";

export default function ExpensesPage({ expenses }: Props) {
  return <ExpensesView expenses={expenses} />;
}
