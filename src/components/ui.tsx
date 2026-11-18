import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Slot } from '@radix-ui/react-slot';
import { cva } from 'class-variance-authority';
import { X, PawPrint } from 'lucide-react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '../lib/utils';

const buttonVariants = cva('button', {
  variants: {
    variant: {
      default: 'button-primary',
      outline: 'button-outline',
      ghost: 'button-ghost',
      danger: 'button-danger',
    },
    size: { default: '', small: 'button-small' },
  },
  defaultVariants: { variant: 'default', size: 'default' },
});

/** Botón componible siguiendo el patrón de shadcn/ui; asChild conserva la semántica del enlace. */
export function Button({
  asChild = false,
  variant = 'default',
  size = 'default',
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  asChild?: boolean;
  variant?: 'default' | 'outline' | 'ghost' | 'danger';
  size?: 'default' | 'small';
}) {
  const Component = asChild ? Slot : 'button';
  return <Component className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}

/** Diálogo accesible con foco atrapado, cierre por Escape y restauración del foco mediante Radix. */
export function Modal({
  title,
  description,
  open,
  onOpenChange,
  placement,
  onCloseAutoFocus,
  children,
}: {
  title: string;
  description?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  placement?: 'right';
  onCloseAutoFocus?: (event: Event) => void;
  children: ReactNode;
}) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="dialog-overlay" />
        <DialogPrimitive.Content
          className={cn('dialog-content', placement === 'right' && 'dialog-side-panel')}
          onCloseAutoFocus={onCloseAutoFocus}
        >
          <DialogPrimitive.Title className="dialog-title">{title}</DialogPrimitive.Title>
          <DialogPrimitive.Description className={description ? 'muted' : 'sr-only'}>
            {description ?? 'Completa los datos de esta acción de demostración.'}
          </DialogPrimitive.Description>
          <DialogPrimitive.Close className="icon-button dialog-close" aria-label="Cerrar">
            <X size={20} />
          </DialogPrimitive.Close>
          {children}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

/** Asocia una etiqueta visible a su control usando el id acordado por el formulario. */
export function Field({
  label,
  htmlFor,
  children,
  hint,
}: {
  label: string;
  htmlFor: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <div className="field">
      <label htmlFor={htmlFor}>{label}</label>
      {children}
      {hint && <small className="muted">{hint}</small>}
    </div>
  );
}

/** Estado vacío con explicación y siguiente paso, sin transmitir ausencia de datos como error. */
export function EmptyState({
  title,
  children,
  action,
}: {
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <span className="icon-orbit">
        <PawPrint size={26} />
      </span>
      <h3>{title}</h3>
      <p className="muted">{children}</p>
      {action}
    </div>
  );
}

/** Mensaje de resultado anunciado por lectores de pantalla sin interrumpir el foco. */
export function Notice({ children, error = false }: { children: ReactNode; error?: boolean }) {
  return (
    <div className={cn('notice', error && 'notice-error')} role={error ? 'alert' : 'status'}>
      {children}
    </div>
  );
}
