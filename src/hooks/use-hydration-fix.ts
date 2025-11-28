
'use client';

import { useState, useEffect } from 'react';

/**
 * Custom hook to fix hydration issues by ensuring a component only renders
 * on the client-side after it has been mounted.
 * @returns {boolean} - `true` if the component is mounted, `false` otherwise.
 */
export function useHydrationFix() {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  return isMounted;
}
