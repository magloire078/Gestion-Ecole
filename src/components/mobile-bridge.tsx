'use client';

import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
// import { StatusBar, Style } from '@capacitor/status-bar'; // If we want to add the plugin later

export function MobileBridge() {
    useEffect(() => {
        const initMobile = async () => {
            if (Capacitor.isNativePlatform()) {
                console.log('Running on native platform:', Capacitor.getPlatform());

                // Example: configuring StatusBar if plugin is installed
                /*
                try {
                    await StatusBar.setStyle({ style: Style.Light });
                    await StatusBar.setBackgroundColor({ color: '#FFFFFF' });
                } catch (e) {
                    console.warn('StatusBar plugin not available');
                }
                */
            }
        };

        initMobile();
    }, []);

    return null; // Side-effect only component
}
