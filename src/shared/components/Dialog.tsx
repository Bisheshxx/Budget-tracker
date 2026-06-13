import {
  Dialog as DialogRoot,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import { useDialog } from '#/shared/hooks/use-dialog'
import type { DialogName } from '#/shared/stores/ui-store'
import type { ReactNode } from 'react'

// Reusable, store-connected dialog. Identified by `name`: it's open when `name`
// matches the store's active dialog, and closing (overlay click / Esc / the X)
// clears the active dialog. Content is passed as children; Radix unmounts the
// content while closed, so a form inside resets between opens.
export function Dialog({
  name,
  title,
  description,
  children,
}: {
  name: DialogName
  title?: string
  description?: string
  children: ReactNode
}) {
  const { isOpen, close } = useDialog(name)

  return (
    <DialogRoot
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) close()
      }}
    >
      <DialogContent>
        {(title || description) && (
          <DialogHeader>
            {title && <DialogTitle>{title}</DialogTitle>}
            {description && <DialogDescription>{description}</DialogDescription>}
          </DialogHeader>
        )}
        {children}
      </DialogContent>
    </DialogRoot>
  )
}
