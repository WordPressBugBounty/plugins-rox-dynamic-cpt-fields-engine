import { cn } from '@/lib/utils';

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rdcfe-animate-pulse rdcfe-rounded-md rdcfe-bg-[hsl(var(--rdcfe-secondary))]',
        className
      )}
      {...props}
    />
  );
}

export { Skeleton };

