import { create } from 'zustand'

// Global, ephemeral UI state shared across features but owned by none.
//
// SSR NOTE: a module-level zustand store is a singleton shared across requests
// on the server. Keep this store strictly to ephemeral *client* UI flags (which
// dialog is open, etc.) — NEVER put per-user data here, or it will leak between
// requests/users during SSR.

// The registry of dialog names. Add one entry per dialog as it's created. A
// const-union (not a TS enum) keeps names type-checked without emitting runtime
// code, matching the codebase's TRANSACTION_TYPES/CURRENCIES style.
export const DIALOG = {
  quickAdd: 'quickAdd',
  editTransaction: 'editTransaction',
  confirmDeleteTransaction: 'confirmDeleteTransaction',
  createCategory: 'createCategory',
  manageCategories: 'manageCategories',
} as const

export type DialogName = (typeof DIALOG)[keyof typeof DIALOG]

interface UiState {
  /** The single dialog currently open (one at a time), or null. */
  activeDialog: DialogName | null
  openDialog: (name: DialogName) => void
  closeDialog: () => void
}

export const useUiStore = create<UiState>((set) => ({
  activeDialog: null,
  openDialog: (name) => set({ activeDialog: name }),
  closeDialog: () => set({ activeDialog: null }),
}))
