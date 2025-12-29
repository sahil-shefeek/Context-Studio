import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex min-h-[60px] w-full rounded-md border border-(--border-color) bg-(--bg-secondary) px-3 py-2 text-sm shadow-sm placeholder:text-(--text-muted) focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-(--accent-color) disabled:cursor-not-allowed disabled:opacity-50 text-(--text-primary) resize-none",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
