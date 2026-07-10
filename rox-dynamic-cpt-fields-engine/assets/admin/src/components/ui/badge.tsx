import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'rdcfe-inline-flex rdcfe-items-center rdcfe-rounded-full rdcfe-border rdcfe-px-2.5 rdcfe-py-0.5 rdcfe-text-xs rdcfe-font-semibold rdcfe-transition-colors focus:rdcfe-outline-none focus:rdcfe-ring-2 focus:rdcfe-ring-[hsl(var(--rdcfe-ring))] focus:rdcfe-ring-offset-2',
  {
    variants: {
      variant: {
        default:
          'rdcfe-border-transparent rdcfe-bg-[hsl(var(--rdcfe-primary))] rdcfe-text-white',
        secondary:
          'rdcfe-border-transparent rdcfe-bg-[hsl(var(--rdcfe-secondary))] rdcfe-text-[hsl(var(--rdcfe-foreground))]',
        destructive:
          'rdcfe-border-transparent rdcfe-bg-red-500 rdcfe-text-white',
        outline: 
          'rdcfe-border-[hsl(var(--rdcfe-border))] rdcfe-text-[hsl(var(--rdcfe-foreground))]',
        success:
          'rdcfe-border-transparent rdcfe-bg-green-500 rdcfe-text-white',
        warning:
          'rdcfe-border-transparent rdcfe-bg-amber-500 rdcfe-text-white',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };

