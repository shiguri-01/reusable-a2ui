import { useEffect, useRef } from "react";
import { bindDrag } from "@ui-sdk/core";
import {
  clampSidebarWidth,
  DEFAULT_SIDEBAR_WIDTH,
  saveSidebarWidth,
} from "../hooks/use-sidebar-width";

export function SidebarResizeHandle() {
  const cleanupDragRef = useRef<(() => void) | null>(null);

  useEffect(() => () => cleanupDragRef.current?.(), []);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    e.preventDefault();
    const wrapper = e.currentTarget.closest<HTMLElement>('[data-slot="sidebar-wrapper"]');
    if (!wrapper) return;

    const startX = e.clientX;
    const initialWidth =
      parseFloat(getComputedStyle(wrapper).getPropertyValue("--sidebar-width")) ||
      DEFAULT_SIDEBAR_WIDTH;
    let latestWidth = initialWidth;

    const resetBodyStyles = () => {
      wrapper.removeAttribute("data-resizing");
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    wrapper.setAttribute("data-resizing", "true");
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    cleanupDragRef.current?.();
    const stop = bindDrag(e.currentTarget, e.nativeEvent, {
      cancelOnEscape: true,
      onMove: ({ x }) => {
        latestWidth = clampSidebarWidth(initialWidth + (startX - x));
        wrapper.style.setProperty("--sidebar-width", `${latestWidth}px`);
      },
      onEnd: (_event, canceled) => {
        cleanupDragRef.current = null;
        resetBodyStyles();
        if (canceled) {
          wrapper.style.setProperty("--sidebar-width", `${initialWidth}px`);
        } else {
          saveSidebarWidth(latestWidth);
        }
      },
    });
    cleanupDragRef.current = () => {
      stop();
      resetBodyStyles();
    };
  };

  const handleDoubleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const wrapper = e.currentTarget.closest<HTMLElement>('[data-slot="sidebar-wrapper"]');
    if (!wrapper) return;
    wrapper.style.setProperty("--sidebar-width", `${DEFAULT_SIDEBAR_WIDTH}px`);
    saveSidebarWidth(DEFAULT_SIDEBAR_WIDTH);
  };

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label="サイドバーの幅を調整（ダブルクリックでリセット）"
      title="ドラッグして幅を調整（ダブルクリックで初期幅に戻す）"
      onPointerDown={handlePointerDown}
      onDoubleClick={handleDoubleClick}
      className="hover:after:bg-primary/40 active:after:bg-primary/60 absolute inset-y-0 -left-1.5 z-20 hidden w-3 cursor-col-resize after:absolute after:inset-y-0 after:left-1/2 after:w-0.5 after:-translate-x-1/2 after:transition-colors md:block"
    />
  );
}
