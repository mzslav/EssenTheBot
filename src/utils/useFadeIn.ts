import { useEffect, useState } from 'react';

export function useFadeIn(ready: boolean, baseDelay = 0) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!ready) return;
    const t = setTimeout(() => setVisible(true), 60);
    return () => clearTimeout(t);
  }, [ready]);

  /**
   * @param index
   * @param step 
   */
  const style = (index = 0, step = 60): React.CSSProperties => ({
    opacity: visible ? 1 : 0,
    transform: visible ? 'translateY(0)' : 'translateY(10px)',
    transition: `opacity 0.35s ease ${baseDelay + index * step}ms, transform 0.35s ease ${baseDelay + index * step}ms`,
  });

  return { visible, style };
}