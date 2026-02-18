import * as React from 'react'
import { cn } from '@/lib/utils'

type TabsContextValue = {
  value?: string
  onValueChange?: (val: string) => void
}

const TabsContext = React.createContext<TabsContextValue>({})

export function Tabs({ value, defaultValue, onValueChange, children, className }: React.PropsWithChildren<{ value?: string; defaultValue?: string; onValueChange?: (v: string) => void; className?: string }>) {
  const [internal, setInternal] = React.useState<string | undefined>(defaultValue)
  const isControlled = value !== undefined

  const current = isControlled ? value : internal

  const handleChange = (v: string) => {
    if (!isControlled) setInternal(v)
    onValueChange?.(v)
  }

  return (
    <TabsContext.Provider value={{ value: current, onValueChange: handleChange }}>
      <div className={cn('', className)}>{children}</div>
    </TabsContext.Provider>
  )
}

export const TabsList = ({ children, className }: { children?: React.ReactNode; className?: string }) => (
  <div className={cn('flex items-center gap-2', className)}>{children}</div>
)

export const TabsTrigger = ({ value, children, className }: { value: string; children?: React.ReactNode; className?: string }) => {
  const ctx = React.useContext(TabsContext)
  const active = ctx.value === value
  return (
    <button type="button" onClick={() => ctx.onValueChange?.(value)} className={cn(active ? 'font-medium' : 'text-muted-foreground', className)}>
      {children}
    </button>
  )
}

export const TabsContent = ({ value, children, className }: { value: string; children?: React.ReactNode; className?: string }) => {
  const ctx = React.useContext(TabsContext)
  if (ctx.value !== value) return null
  return <div className={cn('', className)}>{children}</div>
}

export default Tabs
