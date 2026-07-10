import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'rdcfe-inline-flex rdcfe-items-center rdcfe-justify-center rdcfe-gap-2 rdcfe-whitespace-nowrap rdcfe-rounded-lg rdcfe-text-[13px] rdcfe-font-medium rdcfe-transition-all rdcfe-duration-150 focus-visible:rdcfe-outline-none focus-visible:rdcfe-ring-2 focus-visible:rdcfe-ring-[hsl(var(--rdcfe-ring))] focus-visible:rdcfe-ring-offset-2 disabled:rdcfe-pointer-events-none disabled:rdcfe-opacity-50 [&_svg]:rdcfe-pointer-events-none [&_svg]:rdcfe-h-4 [&_svg]:rdcfe-w-4 [&_svg]:rdcfe-shrink-0',
  {
    variants: {
      variant: {
        default:
          'rdcfe-bg-[hsl(var(--rdcfe-primary))] rdcfe-text-white rdcfe-shadow-sm hover:rdcfe-bg-[hsl(var(--rdcfe-primary))]/90 active:rdcfe-scale-[0.98]',
        destructive:
          'rdcfe-bg-red-500 rdcfe-text-white rdcfe-shadow-sm hover:rdcfe-bg-red-600 active:rdcfe-scale-[0.98]',
        outline:
          'rdcfe-border rdcfe-border-[hsl(var(--rdcfe-border))] rdcfe-bg-white rdcfe-text-[hsl(var(--rdcfe-foreground))] rdcfe-shadow-sm hover:rdcfe-bg-[hsl(var(--rdcfe-secondary))] active:rdcfe-scale-[0.98]',
        secondary:
          'rdcfe-bg-[hsl(var(--rdcfe-secondary))] rdcfe-text-[hsl(var(--rdcfe-foreground))] hover:rdcfe-bg-[hsl(var(--rdcfe-secondary))]/80 active:rdcfe-scale-[0.98]',
        ghost:
          'rdcfe-text-[hsl(var(--rdcfe-foreground))] hover:rdcfe-bg-[hsl(var(--rdcfe-secondary))]',
        link: 'rdcfe-text-[hsl(var(--rdcfe-primary))] rdcfe-underline-offset-4 hover:rdcfe-underline',
      },
      size: {
        default: 'rdcfe-h-9 rdcfe-px-4 rdcfe-py-2',
        sm: 'rdcfe-h-8 rdcfe-rounded-md rdcfe-px-3 rdcfe-text-[12px]',
        lg: 'rdcfe-h-10 rdcfe-rounded-lg rdcfe-px-6',
        icon: 'rdcfe-h-9 rdcfe-w-9',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
