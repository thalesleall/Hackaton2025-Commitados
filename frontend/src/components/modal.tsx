import React from "react"

type ModalProps = {
  title: string
  open: boolean
  onClose: () => void
  children: React.ReactNode
}

export function Modal({ title, open, onClose, children }: ModalProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-96 p-6 relative">
        {/* Botão Fechar */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
        >
          ✖
        </button>

        {/* Título */}
        <h2 className="text-lg font-semibold mb-4">{title}</h2>

        {/* Conteúdo */}
        {children}
      </div>
    </div>
  )
}
