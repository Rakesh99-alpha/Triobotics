import * as React from "react";

// Minimal Popover implementation for UI consistency in this repo.
// Usage matches: <Popover><PopoverTrigger asChild>{children}</PopoverTrigger><PopoverContent>{...}</PopoverContent></Popover>

export function Popover({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  return (
    <PopoverContext.Provider value={{ open, setOpen }}>
      <div className="relative inline-block">{children}</div>
    </PopoverContext.Provider>
  );
}

const PopoverContext = React.createContext<{
  open: boolean;
  setOpen: (v: boolean) => void;
} | null>(null);

export function PopoverTrigger({ children, asChild = false }: any) {
  const ctx = React.useContext(PopoverContext);
  if (!ctx) return null;
  const { open, setOpen } = ctx;

  const child = React.Children.only(children) as React.ReactElement;
  const onClick = (e: any) => {
    setOpen(!open);
    if (React.isValidElement(child) && (child.props as any)?.onClick) {
      (child.props as any).onClick(e);
    }
  };

  return React.cloneElement(child, { onClick } as any);
}

export function PopoverContent({ children, className, align = 'start' }: any) {
  const ctx = React.useContext(PopoverContext);
  if (!ctx) return null;
  const { open, setOpen } = ctx;

  return (
    <div className={`absolute z-50 mt-2 ${className ?? ''}`} style={{ display: open ? 'block' : 'none' }}>
      <div onMouseLeave={() => setOpen(false)}>{children}</div>
    </div>
  );
}
