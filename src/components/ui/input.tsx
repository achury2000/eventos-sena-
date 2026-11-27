import * as React from "react"
import { cn } from "cn"

function Input({ className, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      data-slot="input"
      className={cn(
        "h-10 w-full min-w-0 rounded-xl border border-input bg-background/80 px-3.5 py-1 text-sm text-foreground shadow-xs transition-[color,background-color,border-color,box-shadow] outline-none select-none placeholder:text-muted-foreground hover:border-primary/50 focus-visible:border-ring focus-visible:bg-background focus-visible:ring-4 focus-visible:ring-ring/20 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 dark:bg-input/30",
        className
      )}
      {...props}
    />
  )
}

export { Input }
