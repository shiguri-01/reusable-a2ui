import { useForm } from "@tanstack/react-form";
import type { z } from "zod";
import { a2uiComponentSchema, type A2UIComponent } from "@/features/a2ui/types";

export const GAP_OPTIONS = [
  { value: "sm", label: "狭め" },
  { value: "md", label: "標準" },
  { value: "lg", label: "広め" },
] as const;

/**
 * Merges a partial property patch against the live `node` prop (preserving external
 * structural fields such as `children`) and commits it only when schema-valid.
 */
export function commitComponentPatch<T extends A2UIComponent>(
  node: T,
  patch: Partial<T>,
  onUpdateNode: (nodeId: string, next: A2UIComponent) => void,
  schema: z.ZodType<A2UIComponent> = a2uiComponentSchema,
): void {
  const candidate = { ...node, ...patch, id: node.id };
  const parsed = schema.safeParse(candidate);
  if (parsed.success) {
    onUpdateNode(node.id, parsed.data);
  }
}

/**
 * Wraps TanStack Form for an inspector variant so field changes automatically
 * merge onto the live `node` prop and commit when schema-valid.
 */
export function useInspectorForm<T extends A2UIComponent>(
  node: T,
  schema: z.ZodType<T, T>,
  onUpdateNode: (nodeId: string, next: A2UIComponent) => void,
) {
  return useForm({
    defaultValues: node,
    validators: { onChange: schema },
    listeners: {
      onChange: ({ fieldApi }) => {
        commitComponentPatch(
          node,
          { [fieldApi.name]: fieldApi.state.value } as Partial<T>,
          onUpdateNode,
          schema,
        );
      },
    },
  });
}
