import * as React from 'react';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import { cn } from '@/lib/utils';

const Tabs = TabsPrimitive.Root;

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      'rdcfe-inline-flex rdcfe-h-10 rdcfe-items-center rdcfe-justify-center rdcfe-rounded-md rdcfe-bg-[hsl(var(--rdcfe-secondary))] rdcfe-p-1 rdcfe-text-[hsl(var(--rdcfe-muted-foreground))]',
      className
    )}
    {...props}
  />
));
TabsList.displayName = TabsPrimitive.List.displayName;

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      'rdcfe-inline-flex rdcfe-items-center rdcfe-justify-center rdcfe-whitespace-nowrap rdcfe-rounded-sm rdcfe-px-3 rdcfe-py-1.5 rdcfe-text-sm rdcfe-font-medium rdcfe-ring-offset-white rdcfe-transition-all focus-visible:rdcfe-outline-none focus-visible:rdcfe-ring-2 focus-visible:rdcfe-ring-[hsl(var(--rdcfe-ring))] focus-visible:rdcfe-ring-offset-2 disabled:rdcfe-pointer-events-none disabled:rdcfe-opacity-50 data-[state=active]:rdcfe-bg-white data-[state=active]:rdcfe-text-[hsl(var(--rdcfe-foreground))] data-[state=active]:rdcfe-shadow-sm',
      className
    )}
    {...props}
  />
));
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      'rdcfe-mt-2 rdcfe-ring-offset-white focus-visible:rdcfe-outline-none focus-visible:rdcfe-ring-2 focus-visible:rdcfe-ring-[hsl(var(--rdcfe-ring))] focus-visible:rdcfe-ring-offset-2',
      className
    )}
    {...props}
  />
));
TabsContent.displayName = TabsPrimitive.Content.displayName;

export { Tabs, TabsList, TabsTrigger, TabsContent };

