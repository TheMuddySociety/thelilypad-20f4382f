import React, { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useChain } from '@/providers/ChainProvider';
import { Card } from '@/components/ui/card';

export interface ChainThemedCardProps {
    children: ReactNode;
    className?: string;
    variant?: 'default' | 'accent' | 'muted';
    animate?: boolean;
}

export const ChainThemedCard: React.FC<ChainThemedCardProps> = ({
    children,
    className,
    variant = 'default',
    animate = true,
}) => {
    const { chain } = useChain();
    const { theme } = chain;

    // Determine styling based on variant
    const getBorderStyle = () => {
        switch (variant) {
            case 'accent':
                return {
                    borderColor: theme.primaryColor,
                    borderWidth: '2px',
                };
            case 'muted':
                return {
                    borderColor: theme.cardBorder,
                    borderWidth: '1px',
                };
            default:
                return {
                    borderColor: theme.cardBorder,
                    borderWidth: '1px',
                };
        }
    };

    const borderStyle = getBorderStyle();

    const content = (
        <Card
            className={cn(
                'transition-all duration-300',
                variant === 'accent' && 'shadow-lg',
                className
            )}
            style={{
                borderColor: borderStyle.borderColor,
                borderWidth: borderStyle.borderWidth,
                boxShadow: variant === 'accent'
                    ? `0 0 20px ${theme.glowColor}20`
                    : undefined
            }}
        >
            {children}
        </Card>
    );

    if (animate) {
        return (
            <motion.div
                key={chain.id} // Re-mount on chain change
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
            >
                {content}
            </motion.div>
        );
    }

    return content;
};

export default ChainThemedCard;
