'use client'

import * as React from 'react'

type ToastVariant = 'default' | 'destructive' | 'success'

interface ToastData {
  id: string
  title?: string
  description?: string
  variant?: ToastVariant
  duration?: number
}

interface ToastState {
  toasts: ToastData[]
}

type ToastAction =
  | { type: 'ADD_TOAST'; toast: ToastData }
  | { type: 'REMOVE_TOAST'; id: string }

const toastReducer = (state: ToastState, action: ToastAction): ToastState => {
  switch (action.type) {
    case 'ADD_TOAST':
      return { toasts: [action.toast, ...state.toasts].slice(0, 5) }
    case 'REMOVE_TOAST':
      return { toasts: state.toasts.filter((t) => t.id !== action.id) }
  }
}

const listeners: Array<(state: ToastState) => void> = []
let memoryState: ToastState = { toasts: [] }

function dispatch(action: ToastAction) {
  memoryState = toastReducer(memoryState, action)
  listeners.forEach((l) => l(memoryState))
}

export function toast({
  title,
  description,
  variant = 'default',
  duration = 4000,
}: Omit<ToastData, 'id'>) {
  const id = Math.random().toString(36).slice(2)
  dispatch({ type: 'ADD_TOAST', toast: { id, title, description, variant, duration } })
  setTimeout(() => dispatch({ type: 'REMOVE_TOAST', id }), duration)
  return id
}

export function useToast() {
  const [state, setState] = React.useState<ToastState>(memoryState)

  React.useEffect(() => {
    listeners.push(setState)
    return () => {
      const idx = listeners.indexOf(setState)
      if (idx > -1) listeners.splice(idx, 1)
    }
  }, [])

  return { toasts: state.toasts, toast }
}
