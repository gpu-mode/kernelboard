import { useRef, useState, useCallback, useEffect } from "react";

export function useContainerHeight<T extends HTMLElement = HTMLDivElement>(): {
  containerRef: React.RefCallback<T>;
  height: number;
} {
  const [height, setHeight] = useState(0);
  const observerRef = useRef<ResizeObserver | null>(null);

  const containerRef = useCallback((node: T | null) => {
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }

    if (node) {
      observerRef.current = new ResizeObserver((entries) => {
        const entry = entries[0];
        if (entry) {
          const newHeight = Math.floor(entry.contentRect.height);
          setHeight((prev) => (prev !== newHeight ? newHeight : prev));
        }
      });
      observerRef.current.observe(node);
    }
  }, []);

  useEffect(() => {
    return () => {
      observerRef.current?.disconnect();
    };
  }, []);

  return { containerRef, height };
}
