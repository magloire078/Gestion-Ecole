'use client';

import { useEffect } from 'react';

export function ServiceWorkerRegister() {
    useEffect(() => {
        if (
            process.env.NODE_ENV !== 'production' ||
            typeof navigator === 'undefined' ||
            !('serviceWorker' in navigator)
        ) {
            return;
        }
        navigator.serviceWorker.register('/sw.js').catch((err) => {
            console.warn('[PWA] Service worker registration failed', err);
        });
    }, []);

    return null;
}
