import { arrayMove } from "@dnd-kit/sortable";
import {
  DASHBOARD_SURFACE_ID,
  EXPENSE_CATALOG_ID,
  type A2UIComponent,
  type A2UIMessage,
} from "@/features/a2ui/types";
import { validateA2UISurfaceMessages } from "@/features/a2ui/validate";

export type ContainerComponent = Extract<
  A2UIComponent,
  { component: "Column" | "Row" | "Grid" | "Card" }
>;

export interface BlockBlueprint {
  id: string;
  label: string;
  description: string;
  category: "preset" | "layout" | "display" | "form";
  keywords: string[];
  /** Builds fresh component nodes; the first element is treated as the block's root node. */
  buildNodes: () => A2UIComponent[];
}

export interface EditableSurfaceGraph {
  surfaceId: string;
  catalogId: string;
  rootId: string;
  components: A2UIComponent[];
  componentsById: Map<string, A2UIComponent>;
  parentById: Map<string, string>;
  extraMessages: A2UIMessage[];
}

export function isContainerComponent(comp: A2UIComponent): comp is ContainerComponent {
  return (
    comp.component === "Column" ||
    comp.component === "Row" ||
    comp.component === "Grid" ||
    comp.component === "Card"
  );
}

export function createEmptyDashboardMessages(): A2UIMessage[] {
  return [
    {
      version: "0.9",
      createSurface: {
        surfaceId: DASHBOARD_SURFACE_ID,
        catalogId: EXPENSE_CATALOG_ID,
        rootId: "root",
      },
    },
    {
      version: "0.9",
      updateComponents: {
        surfaceId: DASHBOARD_SURFACE_ID,
        components: [
          {
            id: "root",
            component: "Column",
            gap: "lg",
            children: [],
          },
        ],
      },
    },
  ];
}

export function extractEditableSurface(messages: A2UIMessage[]): EditableSurfaceGraph {
  let surfaceId = DASHBOARD_SURFACE_ID;
  let catalogId = EXPENSE_CATALOG_ID;
  let rootId = "root";
  const componentsById = new Map<string, A2UIComponent>();
  const extraMessages: A2UIMessage[] = [];

  for (const msg of messages) {
    if ("createSurface" in msg) {
      surfaceId = msg.createSurface.surfaceId;
      catalogId = msg.createSurface.catalogId;
      rootId = msg.createSurface.rootId;
      componentsById.clear();
    } else if ("updateComponents" in msg) {
      for (const comp of msg.updateComponents.components) {
        componentsById.set(comp.id, comp);
      }
    } else if ("updateDataModel" in msg) {
      extraMessages.push(msg);
    }
  }

  if (!componentsById.has(rootId)) {
    componentsById.set(rootId, {
      id: rootId,
      component: "Column",
      gap: "lg",
      children: [],
    });
  }

  const parentById = new Map<string, string>();
  for (const comp of componentsById.values()) {
    if (isContainerComponent(comp)) {
      for (const childId of comp.children) {
        if (componentsById.has(childId) && childId !== rootId) {
          parentById.set(childId, comp.id);
        }
      }
    }
  }

  return {
    surfaceId,
    catalogId,
    rootId,
    components: Array.from(componentsById.values()),
    componentsById,
    parentById,
    extraMessages,
  };
}

/**
 * Normalizes components in pre-order tree traversal starting from rootId so that
 * serialized JSON stays clean, deterministic, and easy to read.
 */
export function commitComponentsToMessages(
  baseMessages: A2UIMessage[],
  nextComponents: A2UIComponent[],
  overrideRootId?: string,
): A2UIMessage[] {
  const graph = extractEditableSurface(baseMessages);
  const rootId = overrideRootId ?? graph.rootId;
  const byId = new Map<string, A2UIComponent>();
  for (const comp of nextComponents) {
    byId.set(comp.id, comp);
  }

  const ordered: A2UIComponent[] = [];
  const visited = new Set<string>();

  const visit = (id: string) => {
    if (visited.has(id)) return;
    const node = byId.get(id);
    if (!node) return;
    visited.add(id);
    ordered.push(node);
    if (isContainerComponent(node)) {
      for (const childId of node.children) {
        visit(childId);
      }
    }
  };

  visit(rootId);

  return [
    {
      version: "0.9",
      createSurface: {
        surfaceId: graph.surfaceId,
        catalogId: graph.catalogId,
        rootId,
      },
    },
    {
      version: "0.9",
      updateComponents: {
        surfaceId: graph.surfaceId,
        components: ordered,
      },
    },
    ...graph.extraMessages,
  ];
}

export function isDescendant(
  componentsById: Map<string, A2UIComponent>,
  candidateAncestorId: string,
  targetId: string,
): boolean {
  if (candidateAncestorId === targetId) return true;
  const visited = new Set<string>();
  const stack = [candidateAncestorId];

  while (stack.length > 0) {
    const currentId = stack.pop()!;
    if (visited.has(currentId)) continue;
    visited.add(currentId);
    const node = componentsById.get(currentId);
    if (!node || !isContainerComponent(node)) continue;
    for (const childId of node.children) {
      if (childId === targetId) return true;
      stack.push(childId);
    }
  }
  return false;
}

export function getComponentAncestors(
  graph: EditableSurfaceGraph,
  nodeId: string,
): A2UIComponent[] {
  const chain: A2UIComponent[] = [];
  let cursor: string | undefined = nodeId;
  const guard = new Set<string>();

  while (cursor && !guard.has(cursor)) {
    guard.add(cursor);
    const comp = graph.componentsById.get(cursor);
    if (comp) {
      chain.unshift(comp);
    }
    cursor = graph.parentById.get(cursor);
  }
  return chain;
}

function makeUniqueId(base: string, taken: Set<string>): string {
  const sanitized =
    base
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .replace(/-\d+$/, "") || "node";

  if (!taken.has(sanitized)) {
    taken.add(sanitized);
    return sanitized;
  }

  let counter = 2;
  while (taken.has(`${sanitized}-${counter}`)) {
    counter += 1;
  }
  const next = `${sanitized}-${counter}`;
  taken.add(next);
  return next;
}

function remapComponentIds(nodes: A2UIComponent[], existingIds: Set<string>): A2UIComponent[] {
  const taken = new Set(existingIds);
  const idMap = new Map<string, string>();

  for (const node of nodes) {
    idMap.set(node.id, makeUniqueId(node.id, taken));
  }

  return nodes.map((node) => {
    const nextId = idMap.get(node.id) ?? node.id;
    if (isContainerComponent(node)) {
      return {
        ...node,
        id: nextId,
        children: node.children.map((childId) => idMap.get(childId) ?? childId),
      };
    }
    return {
      ...node,
      id: nextId,
    };
  });
}

export function insertBlock(
  messages: A2UIMessage[],
  blueprint: BlockBlueprint,
  placement?: { parentId?: string; index?: number },
): { messages: A2UIMessage[]; insertedId: string } {
  const graph = extractEditableSurface(messages);
  const rawNodes = blueprint.buildNodes();
  if (rawNodes.length === 0) {
    return { messages, insertedId: graph.rootId };
  }

  const existingIds = new Set(graph.componentsById.keys());
  const remapped = remapComponentIds(rawNodes, existingIds);
  const entryId = remapped[0]!.id;

  const requestedParent = placement?.parentId
    ? graph.componentsById.get(placement.parentId)
    : undefined;
  const targetParent =
    requestedParent && isContainerComponent(requestedParent)
      ? requestedParent
      : graph.componentsById.get(graph.rootId);

  if (!targetParent || !isContainerComponent(targetParent)) {
    return { messages, insertedId: graph.rootId };
  }

  const nextChildren = [...targetParent.children];
  const insertAt =
    placement?.index !== undefined
      ? Math.max(0, Math.min(placement.index, nextChildren.length))
      : nextChildren.length;
  nextChildren.splice(insertAt, 0, entryId);

  const updatedComponents = graph.components.map((comp) =>
    comp.id === targetParent.id ? { ...targetParent, children: nextChildren } : comp,
  );
  updatedComponents.push(...remapped);

  return {
    messages: commitComponentsToMessages(messages, updatedComponents, graph.rootId),
    insertedId: entryId,
  };
}

export function updateComponent(
  messages: A2UIMessage[],
  nodeId: string,
  updater: (current: A2UIComponent) => A2UIComponent,
): A2UIMessage[] {
  const graph = extractEditableSurface(messages);
  const current = graph.componentsById.get(nodeId);
  if (!current) return messages;

  const updated = updater(current);
  const nextComponents = graph.components.map((comp) =>
    comp.id === nodeId ? { ...updated, id: current.id } : comp,
  );
  return commitComponentsToMessages(messages, nextComponents, graph.rootId);
}

export function moveComponent(
  messages: A2UIMessage[],
  activeId: string,
  targetParentId: string,
  targetIndex?: number,
): A2UIMessage[] {
  const graph = extractEditableSurface(messages);
  if (activeId === graph.rootId) return messages;

  const sourceParentId = graph.parentById.get(activeId);
  if (!sourceParentId) return messages;

  const sourceParent = graph.componentsById.get(sourceParentId);
  const targetParent = graph.componentsById.get(targetParentId);
  if (
    !sourceParent ||
    !targetParent ||
    !isContainerComponent(sourceParent) ||
    !isContainerComponent(targetParent)
  ) {
    return messages;
  }

  // Prevent cycles: a container cannot be moved inside itself or its own descendants.
  if (isDescendant(graph.componentsById, activeId, targetParentId)) {
    return messages;
  }

  if (sourceParentId === targetParentId) {
    const oldIndex = sourceParent.children.indexOf(activeId);
    if (oldIndex === -1) return messages;
    const newIndex =
      targetIndex === undefined
        ? sourceParent.children.length - 1
        : Math.max(0, Math.min(targetIndex, sourceParent.children.length - 1));
    if (oldIndex === newIndex) return messages;

    const reordered = arrayMove(sourceParent.children, oldIndex, newIndex);
    const nextComponents = graph.components.map((comp) =>
      comp.id === sourceParentId ? { ...sourceParent, children: reordered } : comp,
    );
    return commitComponentsToMessages(messages, nextComponents, graph.rootId);
  }

  const nextSourceChildren = sourceParent.children.filter((id) => id !== activeId);
  const nextTargetChildren = [...targetParent.children];
  const insertAt =
    targetIndex === undefined
      ? nextTargetChildren.length
      : Math.max(0, Math.min(targetIndex, nextTargetChildren.length));
  nextTargetChildren.splice(insertAt, 0, activeId);

  const nextComponents = graph.components.map((comp) => {
    if (comp.id === sourceParentId) {
      return { ...sourceParent, children: nextSourceChildren };
    }
    if (comp.id === targetParentId) {
      return { ...targetParent, children: nextTargetChildren };
    }
    return comp;
  });

  return commitComponentsToMessages(messages, nextComponents, graph.rootId);
}

export function moveComponentRelative(
  messages: A2UIMessage[],
  nodeId: string,
  direction: "up" | "down",
): A2UIMessage[] {
  const graph = extractEditableSurface(messages);
  const parentId = graph.parentById.get(nodeId);
  if (!parentId) return messages;
  const parent = graph.componentsById.get(parentId);
  if (!parent || !isContainerComponent(parent)) return messages;

  const idx = parent.children.indexOf(nodeId);
  if (idx === -1) return messages;
  const nextIdx = direction === "up" ? idx - 1 : idx + 1;
  if (nextIdx < 0 || nextIdx >= parent.children.length) return messages;

  return moveComponent(messages, nodeId, parentId, nextIdx);
}

export function duplicateComponent(
  messages: A2UIMessage[],
  nodeId: string,
): { messages: A2UIMessage[]; duplicatedId: string | null } {
  const graph = extractEditableSurface(messages);
  if (nodeId === graph.rootId) {
    return { messages, duplicatedId: null };
  }

  const parentId = graph.parentById.get(nodeId);
  const parent = parentId ? graph.componentsById.get(parentId) : undefined;
  if (!parent || !isContainerComponent(parent)) {
    return { messages, duplicatedId: null };
  }

  const subtreeNodes: A2UIComponent[] = [];
  const collect = (id: string) => {
    const node = graph.componentsById.get(id);
    if (!node) return;
    subtreeNodes.push(structuredClone(node));
    if (isContainerComponent(node)) {
      for (const childId of node.children) {
        collect(childId);
      }
    }
  };
  collect(nodeId);
  if (subtreeNodes.length === 0) {
    return { messages, duplicatedId: null };
  }

  const existingIds = new Set(graph.componentsById.keys());
  const clonedNodes = remapComponentIds(subtreeNodes, existingIds);
  const clonedRootId = clonedNodes[0]!.id;

  const idx = parent.children.indexOf(nodeId);
  const nextChildren = [...parent.children];
  nextChildren.splice(idx + 1, 0, clonedRootId);

  const nextComponents = graph.components.map((comp) =>
    comp.id === parent.id ? { ...parent, children: nextChildren } : comp,
  );
  nextComponents.push(...clonedNodes);

  return {
    messages: commitComponentsToMessages(messages, nextComponents, graph.rootId),
    duplicatedId: clonedRootId,
  };
}

export function removeComponent(messages: A2UIMessage[], nodeId: string): A2UIMessage[] {
  const graph = extractEditableSurface(messages);
  if (nodeId === graph.rootId) {
    // Clearing root resets its children rather than deleting the root container itself.
    const rootComp = graph.componentsById.get(graph.rootId);
    if (!rootComp || !isContainerComponent(rootComp)) return messages;
    return commitComponentsToMessages(messages, [{ ...rootComp, children: [] }], graph.rootId);
  }

  const parentId = graph.parentById.get(nodeId);
  const parent = parentId ? graph.componentsById.get(parentId) : undefined;
  if (!parent || !isContainerComponent(parent)) return messages;

  const nextParent: ContainerComponent = {
    ...parent,
    children: parent.children.filter((id) => id !== nodeId),
  };

  const nextComponents = graph.components
    .filter((comp) => comp.id !== nodeId)
    .map((comp) => (comp.id === parent.id ? nextParent : comp));

  // commitComponentsToMessages traverses from rootId, automatically pruning unreachable descendants.
  return commitComponentsToMessages(messages, nextComponents, graph.rootId);
}

export function parseAndValidateDashboardJson(
  json: string,
): { ok: true; messages: A2UIMessage[] } | { ok: false; error: string } {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    return { ok: false, error: "JSON の構文が正しくありません" };
  }

  const result = validateA2UISurfaceMessages(raw, {
    expectedSurfaceId: DASHBOARD_SURFACE_ID,
  });
  if (!result.ok) {
    return { ok: false, error: result.error };
  }
  return { ok: true, messages: result.messages };
}
