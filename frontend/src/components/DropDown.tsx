import React, { useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"

type DropdownProps = {
  open: boolean
  onClose: () => void
  children: React.ReactNode
  align?: "left" | "right"
}

export function Dropdown({ open, onClose, children, align = "right" }: DropdownProps) {
  const ref = useRef<HTMLDivElement>(null)

  // Fechar ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        onClose()
      }
    }
    if (open) document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className={`absolute mt-2 w-64 bg-white rounded-lg shadow-md border p-4 z-50 ${
            align === "right" ? "right-0" : "left-0"
          }`}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
