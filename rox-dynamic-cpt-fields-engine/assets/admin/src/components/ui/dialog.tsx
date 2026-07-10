import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

const Dialog = DialogPrimitive.Root;

const DialogTrigger = DialogPrimitive.Trigger;

const DialogPortal = DialogPrimitive.Portal;

const DialogClose = DialogPrimitive.Close;

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      'rdcfe-fixed rdcfe-inset-0 rdcfe-z-50 rdcfe-bg-black/50 data-[state=open]:rdcfe-animate-in data-[state=closed]:rdcfe-animate-out data-[state=closed]:rdcfe-fade-out-0 data-[state=open]:rdcfe-fade-in-0',
      className
    )}
    {...props}
  />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        'rdcfe-fixed rdcfe-left-[50%] rdcfe-top-[50%] rdcfe-z-50 rdcfe-grid rdcfe-w-full rdcfe-max-w-lg rdcfe-translate-x-[-50%] rdcfe-translate-y-[-50%] rdcfe-gap-4 rdcfe-border rdcfe-border-[hsl(var(--rdcfe-border))] rdcfe-bg-white rdcfe-p-6 rdcfe-shadow-lg rdcfe-duration-200 data-[state=open]:rdcfe-animate-in data-[state=closed]:rdcfe-animate-out data-[state=closed]:rdcfe-fade-out-0 data-[state=open]:rdcfe-fade-in-0 data-[state=closed]:rdcfe-zoom-out-95 data-[state=open]:rdcfe-zoom-in-95 data-[state=closed]:rdcfe-slide-out-to-left-1/2 data-[state=closed]:rdcfe-slide-out-to-top-[48%] data-[state=open]:rdcfe-slide-in-from-left-1/2 data-[state=open]:rdcfe-slide-in-from-top-[48%] rdcfe-rounded-lg',
        className
      )}
      {...props}
    >
      {children}
      <DialogPrimitive.Close className="rdcfe-absolute rdcfe-right-4 rdcfe-top-4 rdcfe-rounded-sm rdcfe-opacity-70 rdcfe-ring-offset-white rdcfe-transition-opacity hover:rdcfe-opacity-100 focus:rdcfe-outline-none focus:rdcfe-ring-2 focus:rdcfe-ring-[hsl(var(--rdcfe-ring))] focus:rdcfe-ring-offset-2 disabled:rdcfe-pointer-events-none data-[state=open]:rdcfe-bg-[hsl(var(--rdcfe-secondary))]">
        <X className="rdcfe-h-4 rdcfe-w-4" />
        <span className="rdcfe-sr-only">Close</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPortal>
));
DialogContent.displayName = DialogPrimitive.Content.displayName;

const DialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      'rdcfe-flex rdcfe-flex-col rdcfe-space-y-1.5 rdcfe-text-center sm:rdcfe-text-left',
      className
    )}
    {...props}
  />
);
DialogHeader.displayName = 'DialogHeader';

const DialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      'rdcfe-flex rdcfe-flex-col-reverse sm:rdcfe-flex-row sm:rdcfe-justify-end sm:rdcfe-space-x-2',
      className
    )}
    {...props}
  />
);
DialogFooter.displayName = 'DialogFooter';

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn(
      'rdcfe-text-lg rdcfe-font-semibold rdcfe-leading-none rdcfe-tracking-tight',
      className
    )}
    {...props}
  />
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn('rdcfe-text-sm rdcfe-text-[hsl(var(--rdcfe-muted-foreground))]', className)}
    {...props}
  />
));
DialogDescription.displayName = DialogPrimitive.Description.displayName;

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
};

