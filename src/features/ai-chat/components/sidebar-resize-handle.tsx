import {
  DEFAULT_SIDEBAR_WIDTH,
  MAX_SIDEBAR_WIDTH,
  MIN_SIDEBAR_WIDTH,
  saveSidebarWidth,
} from "../hooks/use-sidebar-width";

export function SidebarResizeHandle() {
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    const wrapper = e.currentTarget.closest<HTMLElement>('[data-slot="sidebar-wrapper"]');
    if (!wrapper) return;

    const startX = e.clientX;
    const currentWidth =
      parseFloat(getComputedStyle(wrapper).getPropertyValue("--sidebar-width")) ||
      DEFAULT_SIDEBAR_WIDTH;
    let latestWidth = currentWidth;

    wrapper.setAttribute("data-resizing", "true");
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    const handleMove = (ev: PointerEvent) => {
      const delta = startX - ev.clientX;
      latestWidth = Math.round(
        Math.min(MAX_SIDEBAR_WIDTH, Math.max(MIN_SIDEBAR_WIDTH, currentWidth + delta)),
      );
      wrapper.style.setProperty("--sidebar-width", `${latestWidth}px`);
    };

    const handleUp = () => {
      wrapper.removeAttribute("data-resizing");
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      saveSidebarWidth(latestWidth);
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
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
