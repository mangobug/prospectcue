import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cn } from '@/lib/utils';
// shadcn/ui composable Button, adapted to this application's single accent.
export function Button({
  className,
  asChild = false,
  variant = 'default',
  ...props
}: React.ComponentProps<'button'> & {
  asChild?: boolean;
  variant?: 'default' | 'outline' | 'destructive';
}) {
  const Comp = asChild ? Slot : 'button';
  return (
    <Comp
      className={cn(
        'btn',
        variant === 'outline' && 'btn-outline',
        variant === 'destructive' && 'btn-danger',
        className,
      )}
      {...props}
    />
  );
}
