import * as React from 'react'
import { cn } from '@/lib/utils'

type DialogContextValue = {
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

const DialogContext = React.createContext<DialogContextValue>({})

export function Dialog({ open, onOpenChange, children }: React.PropsWithChildren<{ open?: boolean; onOpenChange?: (open: boolean) => void }>) {
  return (
    <DialogContext.Provider value={{ open, onOpenChange }}>
      {children}
    </DialogContext.Provider>
  )
}

export function DialogTrigger({ asChild = false, children }: { asChild?: boolean; children: React.ReactElement }) {
  const ctx = React.useContext(DialogContext)

  const handleClick = (e: React.MouseEvent) => {
    try {
      if (React.isValidElement(children) && (children.props as any)?.onClick) {
        (children.props as any).onClick(e);
      }
    } catch {}
    ctx.onOpenChange?.(true);
  };

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, { onClick: handleClick } as any);
  }

  return (
    <button type="button" onClick={() => ctx.onOpenChange?.(true)}>
      {children}
    </button>
  )
}

export function DialogContent({ className, children }: { className?: string; children?: React.ReactNode }) {
  const ctx = React.useContext(DialogContext)
  if (!ctx.open) return null

  return (
    <div className={cn('fixed inset-0 z-50 flex items-start justify-center p-6', className)}>
      <div className="fixed inset-0 bg-black/40" onClick={() => ctx.onOpenChange?.(false)} />
      <div className="relative z-10 w-full max-w-3xl">{children}</div>
    </div>
  )
}

export const DialogHeader = ({ children }: { children?: React.ReactNode }) => (
  <div className="mb-4">{children}</div>
)

export const DialogTitle = ({ children }: { children?: React.ReactNode }) => (
  <h3 className="text-lg font-semibold">{children}</h3>
)

export default Dialog
