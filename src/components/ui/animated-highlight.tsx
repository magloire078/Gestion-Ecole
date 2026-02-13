'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface AnimatedHighlightProps {
    className?: string;
    delay?: number;
    duration?: number;
}

export function AnimatedHighlight({
    className,
    delay = 0,
    duration = 3
}: AnimatedHighlightProps) {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.2, 0.8, 0.2] }}
            transition={{
                duration,
                delay,
                repeat: Infinity,
                ease: "easeInOut"
            }}
            className={cn(
                "absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#2D9CDB] to-transparent z-20 pointer-events-none",
                className
            )}
        />
    );
}
