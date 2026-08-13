'use client';

import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';

export function ServiceWorkerRegister() {
    useEffect(() => {
        if (
            process.env.NODE_ENV !== 'production' ||
            typeof navigator === 'undefined' ||
            !('serviceWorker' in navigator) ||
            Capacitor.isNativePlatform()
        ) {
            return;
        }
        navigator.serviceWorker.register('/sw.js').catch((err) => {
            console.warn('[PWA] Service worker registration failed', err);
        });
    }, []);

    return null;
}
