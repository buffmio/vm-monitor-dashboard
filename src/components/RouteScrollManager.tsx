import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export function RouteScrollManager() {
  const { pathname } = useLocation();

  useEffect(() => {
    const schedule = window.requestAnimationFrame ?? ((callback: FrameRequestCallback) => window.setTimeout(callback, 0));

    schedule(() => {
      window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
    });
  }, [pathname]);

  return null;
}
