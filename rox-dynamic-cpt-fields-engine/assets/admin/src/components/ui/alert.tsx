import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { AlertCircle, CheckCircle2, Info, XCircle } from 'lucide-react';

const alertVariants = cva(
  'rdcfe-relative rdcfe-w-full rdcfe-rounded-lg rdcfe-border rdcfe-p-4 [&>svg~*]:rdcfe-pl-7 [&>svg+div]:rdcfe-translate-y-[-3px] [&>svg]:rdcfe-absolute [&>svg]:rdcfe-left-4 [&>svg]:rdcfe-top-4 [&>svg]:rdcfe-text-foreground',
  {
    variants: {
      variant: {
        default: 'rdcfe-bg-white rdcfe-text-[hsl(var(--rdcfe-foreground))] rdcfe-border-[hsl(var(--rdcfe-border))]',
        info: 'rdcfe-bg-blue-50 rdcfe-text-blue-900 rdcfe-border-blue-200 [&>svg]:rdcfe-text-blue-600',
        success: 'rdcfe-bg-green-50 rdcfe-text-green-900 rdcfe-border-green-200 [&>svg]:rdcfe-text-green-600',
        warning: 'rdcfe-bg-amber-50 rdcfe-text-amber-900 rdcfe-border-amber-200 [&>svg]:rdcfe-text-amber-600',
        destructive: 'rdcfe-bg-red-50 rdcfe-text-red-900 rdcfe-border-red-200 [&>svg]:rdcfe-text-red-600',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

const Alert = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants>
>(({ className, variant, children, ...props }, ref) => {
  const Icon = {
    default: Info,
    info: Info,
    success: CheckCircle2,
    warning: AlertCircle,
    destructive: XCircle,
  }[variant || 'default'];

  return (
    <div
      ref={ref}
      role="alert"
      className={cn(alertVariants({ variant }), className)}
      {...props}
    >
      <Icon className="rdcfe-h-4 rdcfe-w-4" />
      {children}
    </div>
  );
});
Alert.displayName = 'Alert';

const AlertTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h5
    ref={ref}
    className={cn('rdcfe-mb-1 rdcfe-font-medium rdcfe-leading-none rdcfe-tracking-tight', className)}
    {...props}
  />
));
AlertTitle.displayName = 'AlertTitle';

const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('rdcfe-text-sm [&_p]:rdcfe-leading-relaxed', className)}
    {...props}
  />
));
AlertDescription.displayName = 'AlertDescription';

export { Alert, AlertTitle, AlertDescription };

