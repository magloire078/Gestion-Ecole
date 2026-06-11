'use client';

import { useEffect, useState } from 'react';

/**
 * Custom hook to debounce a value.
 * Useful for debouncing search query inputs to prevent high INP/UI thread blocking.
 *
 * @param value The value to debounce
 * @param delay The delay in milliseconds
 */
export function useDebounce<T>(value: T, delay: number = 200): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);

    return debouncedValue;
}
