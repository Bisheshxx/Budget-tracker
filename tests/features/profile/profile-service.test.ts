import { describe, expect, it, vi } from 'vitest'
import { ProfileService } from '#/features/profile/profile-service.ts'
import type { ProfileUpdate, UserProfile } from '#/features/profile/types.ts'
import type { IProfileRepository } from '#/data/profile/IProfileRepository.ts'
import type { OnboardingInput } from '#/features/profile/schema.ts'

const blankProfile: UserProfile = {
  id: 'profile-1',
  authUserId: 'auth-1',
  displayName: null,
  currency: 'USD',
  budgetPeriodStartDay: 1,
  groceryDayOfWeek: null,
  monthlyBudgetTargetCents: 0,
  onboardingCompletedAt: null,
}

// Minimal in-memory fake — the whole point of ADR 0001's repository pattern.
// `update` echoes the patch back over the blank profile so we can assert what
// the service decided to persist.
function makeFakeRepo(overrides: Partial<IProfileRepository> = {}) {
  return {
    getByAuthUserId: vi.fn(async (_id: string) => blankProfile),
    update: vi.fn(async (_id: string, patch: ProfileUpdate) => ({
      ...blankProfile,
      ...patch,
    })),
    ...overrides,
  } satisfies IProfileRepository
}

const requiredOnly: OnboardingInput = {
  currency: 'USD',
  budgetPeriodStartDay: 15,
  displayName: 'Alex',
}

describe('ProfileService', () => {
  describe('isOnboarded', () => {
    it('is false for a null profile or an un-stamped onboarding marker', () => {
      const service = new ProfileService(makeFakeRepo())
      expect(service.isOnboarded(null)).toBe(false)
      expect(service.isOnboarded(blankProfile)).toBe(false)
    })

    it('is true once onboarding_completed_at is stamped (display name irrelevant)', () => {
      const service = new ProfileService(makeFakeRepo())
      expect(
        service.isOnboarded({
          ...blankProfile,
          onboardingCompletedAt: '2026-06-13T12:00:00.000Z',
        }),
      ).toBe(true)
    })
  })

  describe('completeOnboarding', () => {
    it('persists the required fields and marks the user onboarded', async () => {
      const repo = makeFakeRepo()
      const service = new ProfileService(repo)

      const saved = await service.completeOnboarding('auth-1', requiredOnly)

      expect(repo.update).toHaveBeenCalledWith('auth-1', {
        displayName: 'Alex',
        currency: 'USD',
        budgetPeriodStartDay: 15,
        groceryDayOfWeek: null,
        monthlyBudgetTargetCents: 0,
        onboardingCompletedAt: expect.any(String),
      })
      expect(service.isOnboarded(saved)).toBe(true)
    })

    it('converts the Budget Target from display units to integer cents', async () => {
      const repo = makeFakeRepo()
      const service = new ProfileService(repo)

      await service.completeOnboarding('auth-1', {
        ...requiredOnly,
        monthlyBudgetTarget: 1500.5,
      })

      expect(repo.update).toHaveBeenCalledWith(
        'auth-1',
        expect.objectContaining({ monthlyBudgetTargetCents: 150050 }),
      )
    })

    it('passes the optional grocery day through when provided', async () => {
      const repo = makeFakeRepo()
      const service = new ProfileService(repo)

      await service.completeOnboarding('auth-1', {
        ...requiredOnly,
        groceryDayOfWeek: 6,
      })

      expect(repo.update).toHaveBeenCalledWith(
        'auth-1',
        expect.objectContaining({
          groceryDayOfWeek: 6,
        }),
      )
    })

    it('rejects a missing currency and never hits the repo', async () => {
      const repo = makeFakeRepo()
      const service = new ProfileService(repo)

      await expect(
        service.completeOnboarding('auth-1', {
          budgetPeriodStartDay: 1,
          displayName: 'Alex',
        } as OnboardingInput),
      ).rejects.toThrow()
      expect(repo.update).not.toHaveBeenCalled()
    })

    it('rejects a Period start day outside 1–28', async () => {
      const repo = makeFakeRepo()
      const service = new ProfileService(repo)

      await expect(
        service.completeOnboarding('auth-1', {
          ...requiredOnly,
          budgetPeriodStartDay: 31,
        }),
      ).rejects.toThrow('Day must be between 1 and 28')
      expect(repo.update).not.toHaveBeenCalled()
    })

    it('completes without a display name and still marks the user onboarded', async () => {
      const repo = makeFakeRepo()
      const service = new ProfileService(repo)

      const saved = await service.completeOnboarding('auth-1', {
        currency: 'USD',
        budgetPeriodStartDay: 1,
      })

      expect(saved.displayName).toBeNull()
      expect(service.isOnboarded(saved)).toBe(true)
      expect(repo.update).toHaveBeenCalledWith(
        'auth-1',
        expect.objectContaining({
          displayName: null,
          onboardingCompletedAt: expect.any(String),
        }),
      )
    })
  })

  describe('getProfile', () => {
    it('delegates to the repository', async () => {
      const repo = makeFakeRepo()
      const service = new ProfileService(repo)

      await expect(service.getProfile('auth-1')).resolves.toEqual(blankProfile)
      expect(repo.getByAuthUserId).toHaveBeenCalledWith('auth-1')
    })
  })
})
