'use client';
import { useFormStatus } from 'react-dom';
import { Button } from './ui/button';
export function SubmitButton({
  children,
  disabled = false,
}: {
  children: React.ReactNode;
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending || disabled} aria-busy={pending}>
      {pending ? 'Please wait…' : children}
    </Button>
  );
}
