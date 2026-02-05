import React from 'react';
import { motion } from 'framer-motion';

export const AnimatedBackground = () => (
    <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-primary/5" />
        {[...Array(20)].map((_, i) => (
            <motion.div
                key={i}
                className="absolute w-2 h-2 rounded-full bg-primary/20"
                initial={{
                    x: Math.random() * window.innerWidth,
                    y: Math.random() * window.innerHeight,
                    scale: Math.random() * 0.5 + 0.5,
                }}
                animate={{
                    y: [null, Math.random() * -200 - 100],
                    opacity: [0.3, 0.8, 0],
                }}
                transition={{
                    duration: Math.random() * 3 + 2,
                    repeat: Infinity,
                    ease: "easeOut",
                    delay: Math.random() * 2,
                }}
            />
        ))}
    </div>
);
