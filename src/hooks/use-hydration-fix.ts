
'use client';

import { useState, useEffect } from 'react';

/**
 * Ce hook résout les erreurs d'hydratation Next.js en s'assurant qu'un composant
 * ne est rendu côté client qu'après la fin de l'hydratation.
 *
 * @returns {boolean} - `true` si le composant est monté côté client, sinon `false`.
 */
export const useHydrationFix = () => {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  return isMounted;
};
