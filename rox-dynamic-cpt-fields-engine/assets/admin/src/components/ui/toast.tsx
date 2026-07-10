import * as React from 'react';
import * as ToastPrimitives from '@radix-ui/react-toast';
import { cva, type VariantProps } from 'class-variance-authority';
import { X } from 'lucide-react';

import { cn } from '@/lib/utils';

const ToastProvider = ToastPrimitives.Provider;

const ToastViewport = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Viewport>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Viewport>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Viewport
    ref={ref}
    className={cn(
      'rdcfe-fixed rdcfe-top-0 rdcfe-z-[100] rdcfe-flex rdcfe-max-h-screen rdcfe-w-full rdcfe-flex-col-reverse rdcfe-p-4 sm:rdcfe-bottom-0 sm:rdcfe-right-0 sm:rdcfe-top-auto sm:rdcfe-flex-col md:rdcfe-max-w-[420px]',
      className
    )}
    {...props}
  />
));
ToastViewport.displayName = ToastPrimitives.Viewport.displayName;

const toastVariants = cva(
  'rdcfe-group rdcfe-pointer-events-auto rdcfe-relative rdcfe-flex rdcfe-w-full rdcfe-items-center rdcfe-justify-between rdcfe-space-x-4 rdcfe-overflow-hidden rdcfe-rounded-md rdcfe-border rdcfe-p-6 rdcfe-pr-8 rdcfe-shadow-lg rdcfe-transition-all data-[swipe=cancel]:rdcfe-translate-x-0 data-[swipe=end]:rdcfe-translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=move]:rdcfe-translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:rdcfe-transition-none data-[state=open]:rdcfe-animate-in data-[state=closed]:rdcfe-animate-out data-[swipe=end]:rdcfe-animate-out data-[state=closed]:rdcfe-fade-out-80 data-[state=closed]:rdcfe-slide-out-to-right-full data-[state=open]:rdcfe-slide-in-from-top-full data-[state=open]:sm:rdcfe-slide-in-from-bottom-full',
  {
    variants: {
      variant: {
        default: 'rdcfe-border rdcfe-bg-background rdcfe-text-foreground',
        destructive:
          'rdcfe-destructive rdcfe-group rdcfe-border-destructive rdcfe-bg-destructive rdcfe-text-destructive-foreground',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

const Toast = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Root> &
    VariantProps<typeof toastVariants>
>(({ className, variant, ...props }, ref) => {
  return (
    <ToastPrimitives.Root
      ref={ref}
      className={cn(toastVariants({ variant }), className)}
      {...props}
    />
  );
});
Toast.displayName = ToastPrimitives.Root.displayName;

const ToastAction = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Action>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Action>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Action
    ref={ref}
    className={cn(
      'rdcfe-inline-flex rdcfe-h-8 rdcfe-shrink-0 rdcfe-items-center rdcfe-justify-center rdcfe-rounded-md rdcfe-border rdcfe-bg-transparent rdcfe-px-3 rdcfe-text-sm rdcfe-font-medium rdcfe-ring-offset-background rdcfe-transition-colors hover:rdcfe-bg-secondary focus:rdcfe-outline-none focus:rdcfe-ring-2 focus:rdcfe-ring-ring focus:rdcfe-ring-offset-2 disabled:rdcfe-pointer-events-none disabled:rdcfe-opacity-50 group-[.destructive]:rdcfe-border-muted/40 group-[.destructive]:hover:rdcfe-border-destructive/30 group-[.destructive]:hover:rdcfe-bg-destructive group-[.destructive]:hover:rdcfe-text-destructive-foreground group-[.destructive]:focus:rdcfe-ring-destructive',
      className
    )}
    {...props}
  />
));
ToastAction.displayName = ToastPrimitives.Action.displayName;

const ToastClose = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Close>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Close>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Close
    ref={ref}
    className={cn(
      'rdcfe-absolute rdcfe-right-2 rdcfe-top-2 rdcfe-rounded-md rdcfe-p-1 rdcfe-text-foreground/50 rdcfe-opacity-0 rdcfe-transition-opacity hover:rdcfe-text-foreground focus:rdcfe-opacity-100 focus:rdcfe-outline-none focus:rdcfe-ring-2 group-hover:rdcfe-opacity-100 group-[.destructive]:rdcfe-text-red-300 group-[.destructive]:hover:rdcfe-text-red-50 group-[.destructive]:focus:rdcfe-ring-red-400 group-[.destructive]:focus:rdcfe-ring-offset-red-600',
      className
    )}
    toast-close=""
    {...props}
  >
    <X className="rdcfe-h-4 rdcfe-w-4" />
  </ToastPrimitives.Close>
));
ToastClose.displayName = ToastPrimitives.Close.displayName;

const ToastTitle = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Title>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Title>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Title
    ref={ref}
    className={cn('rdcfe-text-sm rdcfe-font-semibold', className)}
    {...props}
  />
));
ToastTitle.displayName = ToastPrimitives.Title.displayName;

const ToastDescription = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Description>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Description>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Description
    ref={ref}
    className={cn('rdcfe-text-sm rdcfe-opacity-90', className)}
    {...props}
  />
));
ToastDescription.displayName = ToastPrimitives.Description.displayName;

type ToastProps = React.ComponentPropsWithoutRef<typeof Toast>;

type ToastActionElement = React.ReactElement<typeof ToastAction>;

export {
  type ToastProps,
  type ToastActionElement,
  ToastProvider,
  ToastViewport,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastClose,
  ToastAction,
};
