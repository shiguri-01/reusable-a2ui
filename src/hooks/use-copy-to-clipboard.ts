import { useCallback, useEffect, useRef, useState } from "react";

export function useCopyToClipboard(resetDelayMs = 1600) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  const copy = useCallback(
    async (text: string): Promise<boolean> => {
      try {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        if (timerRef.current !== null) {
          clearTimeout(timerRef.current);
        }
        timerRef.current = setTimeout(() => {
          timerRef.current = null;
          setCopied(false);
        }, resetDelayMs);
        return true;
      } catch {
        return false;
      }
    },
    [resetDelayMs],
  );

  return { copied, copy };
}
