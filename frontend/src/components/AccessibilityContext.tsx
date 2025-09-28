import { createContext, useContext, useEffect, useState, ReactNode } from "react"

type AccessibilityContextType = {
  isLargeFont: boolean
  isHighContrast: boolean
  toggleFontSize: () => void
  toggleContrast: () => void
}

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined)

export function AccessibilityProvider({ children }: { children: ReactNode }) {
  const [isLargeFont, setIsLargeFont] = useState(false)
  const [isHighContrast, setIsHighContrast] = useState(false)

  // Carregar preferências salvas
  useEffect(() => {
    const font = localStorage.getItem("largeFont")
    const contrast = localStorage.getItem("highContrast")

    if (font === "true") setIsLargeFont(true)
    if (contrast === "true") setIsHighContrast(true)
  }, [])

  // Salvar preferências
  useEffect(() => {
    localStorage.setItem("largeFont", String(isLargeFont))
    document.documentElement.style.fontSize = isLargeFont ? "18px" : "14px"
  }, [isLargeFont])

  useEffect(() => {
    localStorage.setItem("highContrast", String(isHighContrast))
    document.body.classList.toggle("high-contrast", isHighContrast)
  }, [isHighContrast])

  const toggleFontSize = () => setIsLargeFont((prev) => !prev)
  const toggleContrast = () => setIsHighContrast((prev) => !prev)

  return (
    <AccessibilityContext.Provider
      value={{ isLargeFont, isHighContrast, toggleFontSize, toggleContrast }}
    >
      {children}
    </AccessibilityContext.Provider>
  )
}

export function useAccessibility() {
  const context = useContext(AccessibilityContext)
  if (!context) throw new Error("useAccessibility deve ser usado dentro do AccessibilityProvider")
  return context
}
