import React, { useState } from 'react';
import { cn } from '../../lib/utils';
import { ChevronDown } from 'lucide-react';

interface SectionProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  defaultOpen?: boolean;
  badge?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function Section({
  title,
  description,
  icon,
  defaultOpen = true,
  badge,
  children,
  className,
}: SectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className={cn('rdcfe-section', className)}>
      <div
        className="rdcfe-section-header"
        data-open={isOpen}
        onClick={() => setIsOpen(!isOpen)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsOpen(!isOpen);
          }
        }}
      >
        <div className="rdcfe-section-title">
          {icon && <span className="rdcfe-text-[hsl(var(--rdcfe-primary))]">{icon}</span>}
          <span>{title}</span>
          {badge}
        </div>
        <ChevronDown
          className={cn(
            'rdcfe-w-5 rdcfe-h-5 rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] rdcfe-transition-transform rdcfe-duration-200',
            isOpen && 'rdcfe-rotate-180'
          )}
        />
      </div>
      {isOpen && (
        <div className="rdcfe-section-content rdcfe-animate-fade-in">
          {description && (
            <p className="rdcfe-text-[13px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] rdcfe-mb-4">
              {description}
            </p>
          )}
          {children}
        </div>
      )}
    </div>
  );
}

// Non-collapsible section (just a styled container)
interface SectionBoxProps {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  headerAction?: React.ReactNode;
}

export function SectionBox({
  title,
  description,
  icon,
  children,
  className,
  headerAction,
}: SectionBoxProps) {
  return (
    <div className={cn('rdcfe-section', className)}>
      {title && (
        <div className="rdcfe-section-header rdcfe-cursor-default" data-open="true">
          <div className="rdcfe-section-title">
            {icon && <span className="rdcfe-text-[hsl(var(--rdcfe-primary))]">{icon}</span>}
            <span>{title}</span>
          </div>
          {headerAction}
        </div>
      )}
      <div className="rdcfe-section-content">
        {description && (
          <p className="rdcfe-text-[13px] rdcfe-text-[hsl(var(--rdcfe-muted-foreground))] rdcfe-mb-4">
            {description}
          </p>
        )}
        {children}
      </div>
    </div>
  );
}

