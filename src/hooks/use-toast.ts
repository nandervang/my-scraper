import { toast as sonnerToast } from "sonner"

type ToastVariant = "default" | "destructive" | "success"

interface ToastOptions {
  title?: string
  description?: string
  variant?: ToastVariant
}

export const useToast = () => {
  const toast = ({ title, description, variant = "default" }: ToastOptions) => {
    const message = title || description || ""
    const desc = title && description ? description : undefined

    switch (variant) {
      case "destructive":
        sonnerToast.error(message, { description: desc })
        break
      case "success":
        sonnerToast.success(message, { description: desc })
        break
      default:
        sonnerToast(message, { description: desc })
        break
    }
  }

  return { toast }
}