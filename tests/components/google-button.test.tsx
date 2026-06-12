// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'

// Mock the auth context so the button is exercised in isolation — no provider,
// no real OAuth redirect. vi.hoisted keeps the spy reachable in the factory.
const { signInWithGoogle } = vi.hoisted(() => ({
  signInWithGoogle: vi.fn(),
}))

vi.mock('#/lib/auth-context.tsx', () => ({
  useAuth: () => ({ signInWithGoogle }),
}))

const { GoogleButton } = await import('#/components/google-button.tsx')

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('GoogleButton', () => {
  it('calls signInWithGoogle when clicked', async () => {
    signInWithGoogle.mockResolvedValue(undefined)
    render(<GoogleButton />)

    fireEvent.click(screen.getByRole('button', { name: /continue with google/i }))

    expect(signInWithGoogle).toHaveBeenCalledOnce()
  })

  it('surfaces an error and re-enables the button when the redirect fails', async () => {
    signInWithGoogle.mockRejectedValue(new Error('provider not enabled'))
    render(<GoogleButton />)

    const button = screen.getByRole('button', { name: /continue with google/i })
    fireEvent.click(button)

    expect(await screen.findByText('provider not enabled')).toBeTruthy()
    expect((button as HTMLButtonElement).disabled).toBe(false)
  })
})
