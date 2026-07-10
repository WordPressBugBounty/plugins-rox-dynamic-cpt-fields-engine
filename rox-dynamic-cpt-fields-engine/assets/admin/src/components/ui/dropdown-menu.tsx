import * as React from 'react';
import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu';
import { Check, ChevronRight, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';

const DropdownMenu = DropdownMenuPrimitive.Root;

const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger;

const DropdownMenuGroup = DropdownMenuPrimitive.Group;

const DropdownMenuPortal = DropdownMenuPrimitive.Portal;

const DropdownMenuSub = DropdownMenuPrimitive.Sub;

const DropdownMenuRadioGroup = DropdownMenuPrimitive.RadioGroup;

const DropdownMenuSubTrigger = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.SubTrigger>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.SubTrigger> & {
    inset?: boolean;
  }
>(({ className, inset, children, ...props }, ref) => (
  <DropdownMenuPrimitive.SubTrigger
    ref={ref}
    className={cn(
      'rdcfe-flex rdcfe-cursor-default rdcfe-select-none rdcfe-items-center rdcfe-rounded-sm rdcfe-px-2 rdcfe-py-1.5 rdcfe-text-sm rdcfe-outline-none focus:rdcfe-bg-[hsl(var(--rdcfe-secondary))] data-[state=open]:rdcfe-bg-[hsl(var(--rdcfe-secondary))]',
      inset && 'rdcfe-pl-8',
      className
    )}
    {...props}
  >
    {children}
    <ChevronRight className="rdcfe-ml-auto rdcfe-h-4 rdcfe-w-4" />
  </DropdownMenuPrimitive.SubTrigger>
));
DropdownMenuSubTrigger.displayName = DropdownMenuPrimitive.SubTrigger.displayName;

const DropdownMenuSubContent = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.SubContent>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.SubContent>
>(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.SubContent
    ref={ref}
    className={cn(
      'rdcfe-z-50 rdcfe-min-w-[8rem] rdcfe-overflow-hidden rdcfe-rounded-md rdcfe-border rdcfe-border-[hsl(var(--rdcfe-border))] rdcfe-bg-white rdcfe-p-1 rdcfe-text-[hsl(var(--rdcfe-foreground))] rdcfe-shadow-lg data-[state=open]:rdcfe-animate-in data-[state=closed]:rdcfe-animate-out data-[state=closed]:rdcfe-fade-out-0 data-[state=open]:rdcfe-fade-in-0 data-[state=closed]:rdcfe-zoom-out-95 data-[state=open]:rdcfe-zoom-in-95 data-[side=bottom]:rdcfe-slide-in-from-top-2 data-[side=left]:rdcfe-slide-in-from-right-2 data-[side=right]:rdcfe-slide-in-from-left-2 data-[side=top]:rdcfe-slide-in-from-bottom-2',
      className
    )}
    {...props}
  />
));
DropdownMenuSubContent.displayName = DropdownMenuPrimitive.SubContent.displayName;

const DropdownMenuContent = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <DropdownMenuPrimitive.Portal>
    <DropdownMenuPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        'rdcfe-z-50 rdcfe-min-w-[8rem] rdcfe-overflow-hidden rdcfe-rounded-md rdcfe-border rdcfe-border-[hsl(var(--rdcfe-border))] rdcfe-bg-white rdcfe-p-1 rdcfe-text-[hsl(var(--rdcfe-foreground))] rdcfe-shadow-md data-[state=open]:rdcfe-animate-in data-[state=closed]:rdcfe-animate-out data-[state=closed]:rdcfe-fade-out-0 data-[state=open]:rdcfe-fade-in-0 data-[state=closed]:rdcfe-zoom-out-95 data-[state=open]:rdcfe-zoom-in-95 data-[side=bottom]:rdcfe-slide-in-from-top-2 data-[side=left]:rdcfe-slide-in-from-right-2 data-[side=right]:rdcfe-slide-in-from-left-2 data-[side=top]:rdcfe-slide-in-from-bottom-2',
        className
      )}
      {...props}
    />
  </DropdownMenuPrimitive.Portal>
));
DropdownMenuContent.displayName = DropdownMenuPrimitive.Content.displayName;

const DropdownMenuItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Item> & {
    inset?: boolean;
  }
>(({ className, inset, ...props }, ref) => (
  <DropdownMenuPrimitive.Item
    ref={ref}
    className={cn(
      'rdcfe-relative rdcfe-flex rdcfe-cursor-default rdcfe-select-none rdcfe-items-center rdcfe-rounded-sm rdcfe-px-2 rdcfe-py-1.5 rdcfe-text-sm rdcfe-outline-none rdcfe-transition-colors focus:rdcfe-bg-[hsl(var(--rdcfe-secondary))] focus:rdcfe-text-[hsl(var(--rdcfe-foreground))] data-[disabled]:rdcfe-pointer-events-none data-[disabled]:rdcfe-opacity-50',
      inset && 'rdcfe-pl-8',
      className
    )}
    {...props}
  />
));
DropdownMenuItem.displayName = DropdownMenuPrimitive.Item.displayName;

const DropdownMenuCheckboxItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.CheckboxItem>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.CheckboxItem>
>(({ className, children, checked, ...props }, ref) => (
  <DropdownMenuPrimitive.CheckboxItem
    ref={ref}
    className={cn(
      'rdcfe-relative rdcfe-flex rdcfe-cursor-default rdcfe-select-none rdcfe-items-center rdcfe-rounded-sm rdcfe-py-1.5 rdcfe-pl-8 rdcfe-pr-2 rdcfe-text-sm rdcfe-outline-none rdcfe-transition-colors focus:rdcfe-bg-[hsl(var(--rdcfe-secondary))] focus:rdcfe-text-[hsl(var(--rdcfe-foreground))] data-[disabled]:rdcfe-pointer-events-none data-[disabled]:rdcfe-opacity-50',
      className
    )}
    checked={checked}
    {...props}
  >
    <span className="rdcfe-absolute rdcfe-left-2 rdcfe-flex rdcfe-h-3.5 rdcfe-w-3.5 rdcfe-items-center rdcfe-justify-center">
      <DropdownMenuPrimitive.ItemIndicator>
        <Check className="rdcfe-h-4 rdcfe-w-4" />
      </DropdownMenuPrimitive.ItemIndicator>
    </span>
    {children}
  </DropdownMenuPrimitive.CheckboxItem>
));
DropdownMenuCheckboxItem.displayName = DropdownMenuPrimitive.CheckboxItem.displayName;

const DropdownMenuRadioItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.RadioItem>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.RadioItem>
>(({ className, children, ...props }, ref) => (
  <DropdownMenuPrimitive.RadioItem
    ref={ref}
    className={cn(
      'rdcfe-relative rdcfe-flex rdcfe-cursor-default rdcfe-select-none rdcfe-items-center rdcfe-rounded-sm rdcfe-py-1.5 rdcfe-pl-8 rdcfe-pr-2 rdcfe-text-sm rdcfe-outline-none rdcfe-transition-colors focus:rdcfe-bg-[hsl(var(--rdcfe-secondary))] focus:rdcfe-text-[hsl(var(--rdcfe-foreground))] data-[disabled]:rdcfe-pointer-events-none data-[disabled]:rdcfe-opacity-50',
      className
    )}
    {...props}
  >
    <span className="rdcfe-absolute rdcfe-left-2 rdcfe-flex rdcfe-h-3.5 rdcfe-w-3.5 rdcfe-items-center rdcfe-justify-center">
      <DropdownMenuPrimitive.ItemIndicator>
        <Circle className="rdcfe-h-2 rdcfe-w-2 rdcfe-fill-current" />
      </DropdownMenuPrimitive.ItemIndicator>
    </span>
    {children}
  </DropdownMenuPrimitive.RadioItem>
));
DropdownMenuRadioItem.displayName = DropdownMenuPrimitive.RadioItem.displayName;

const DropdownMenuLabel = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Label> & {
    inset?: boolean;
  }
>(({ className, inset, ...props }, ref) => (
  <DropdownMenuPrimitive.Label
    ref={ref}
    className={cn(
      'rdcfe-px-2 rdcfe-py-1.5 rdcfe-text-sm rdcfe-font-semibold',
      inset && 'rdcfe-pl-8',
      className
    )}
    {...props}
  />
));
DropdownMenuLabel.displayName = DropdownMenuPrimitive.Label.displayName;

const DropdownMenuSeparator = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.Separator
    ref={ref}
    className={cn('rdcfe--mx-1 rdcfe-my-1 rdcfe-h-px rdcfe-bg-[hsl(var(--rdcfe-border))]', className)}
    {...props}
  />
));
DropdownMenuSeparator.displayName = DropdownMenuPrimitive.Separator.displayName;

const DropdownMenuShortcut = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) => {
  return (
    <span
      className={cn('rdcfe-ml-auto rdcfe-text-xs rdcfe-tracking-widest rdcfe-opacity-60', className)}
      {...props}
    />
  );
};
DropdownMenuShortcut.displayName = 'DropdownMenuShortcut';

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuGroup,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuRadioGroup,
};

