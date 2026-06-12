import { afterEach, describe, expect, it } from 'vitest'
import { useUiStore } from '#/shared/stores/ui-store.ts'

// The store is a module singleton — reset it between tests.
afterEach(() => {
  useUiStore.setState({ activeDialog: null })
})

describe('uiStore', () => {
  it('starts with no active dialog', () => {
    expect(useUiStore.getState().activeDialog).toBeNull()
  })

  it('openDialog sets the active dialog', () => {
    useUiStore.getState().openDialog('quickAdd')
    expect(useUiStore.getState().activeDialog).toBe('quickAdd')
  })

  it('closeDialog clears the active dialog', () => {
    useUiStore.getState().openDialog('quickAdd')
    useUiStore.getState().closeDialog()
    expect(useUiStore.getState().activeDialog).toBeNull()
  })

  it('opening another dialog replaces the first (one at a time)', () => {
    useUiStore.getState().openDialog('quickAdd')
    // A second name would replace the first; with only one name today, re-opening
    // is idempotent — assert the single-slot invariant holds.
    useUiStore.getState().openDialog('quickAdd')
    expect(useUiStore.getState().activeDialog).toBe('quickAdd')
  })
})
