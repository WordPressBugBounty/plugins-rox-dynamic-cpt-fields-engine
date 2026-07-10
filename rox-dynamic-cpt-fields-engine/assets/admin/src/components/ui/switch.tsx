import * as React from 'react';
import * as SwitchPrimitives from '@radix-ui/react-switch';
import { cn } from '@/lib/utils';

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitives.Root
    className={cn(
      'rdcfe-peer rdcfe-inline-flex rdcfe-h-6 rdcfe-w-11 rdcfe-shrink-0 rdcfe-cursor-pointer rdcfe-items-center rdcfe-rounded-full rdcfe-border-2 rdcfe-border-transparent rdcfe-transition-colors focus-visible:rdcfe-outline-none focus-visible:rdcfe-ring-2 focus-visible:rdcfe-ring-[hsl(var(--rdcfe-ring))] focus-visible:rdcfe-ring-offset-2 focus-visible:rdcfe-ring-offset-white disabled:rdcfe-cursor-not-allowed disabled:rdcfe-opacity-50 data-[state=checked]:rdcfe-bg-[hsl(var(--rdcfe-primary))] data-[state=unchecked]:rdcfe-bg-[hsl(var(--rdcfe-secondary))]',
      className
    )}
    {...props}
    ref={ref}
  >
    <SwitchPrimitives.Thumb
      className={cn(
        'rdcfe-pointer-events-none rdcfe-block rdcfe-h-5 rdcfe-w-5 rdcfe-rounded-full rdcfe-bg-white rdcfe-shadow-lg rdcfe-ring-0 rdcfe-transition-transform data-[state=checked]:rdcfe-translate-x-5 data-[state=unchecked]:rdcfe-translate-x-0'
      )}
    />
  </SwitchPrimitives.Root>
));
Switch.displayName = SwitchPrimitives.Root.displayName;

export { Switch };

