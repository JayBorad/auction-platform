import React from 'react';
import { cn } from '@/lib/utils';

interface LoadingProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  withText?: boolean;
}

export function Loading({ className, size = 'md', withText = false }: LoadingProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12'
  };

  return (
    <div className={cn("flex flex-col items-center justify-center", className)}>
      <div className="animate-pulse flex space-x-4">
        <div className={cn("rounded-full bg-gray-800", sizeClasses[size])}></div>
        {withText && (
          <div className="space-y-2">
            <div className="h-4 w-48 bg-gray-800 rounded"></div>
            <div className="h-4 w-24 bg-gray-800 rounded"></div>
          </div>
        )}
      </div>
    </div>
  );
} 