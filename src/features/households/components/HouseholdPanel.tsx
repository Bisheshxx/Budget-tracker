import { householdService } from '#/features/households'
import { HouseholdInvites } from '#/features/households/components/HouseholdInvites'
import { HouseholdMembers } from '#/features/households/components/HouseholdMembers'
import { HouseholdSettingsForm } from '#/features/households/components/HouseholdSettingsForm'
import { useHouseholds } from '#/shared/hooks/use-households'
import { useProfile } from '#/shared/hooks/use-profile'
import { useDialog } from '#/shared/hooks/use-dialog'
import { DIALOG } from '#/shared/stores/ui-store'
import { Button } from '#/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#/components/ui/card'

// The Settings section for the active Household. A group shows its settings
// (Admin only), members and invite links; the Personal household — a ledger of
// one — shows how to start a group instead.
export function HouseholdPanel() {
  const { active } = useHouseholds()
  const { profile } = useProfile()
  const { open: openCreate } = useDialog(DIALOG.createHousehold)

  if (!active || !profile) return null

  if (active.isPersonal) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Groups</CardTitle>
          <CardDescription>
            You are in your personal ledger, which only you can see. A group is
            a shared ledger: everyone in it sees and adds to the same income and
            expenses, and your personal entries stay separate.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={openCreate}>New group</Button>
        </CardContent>
      </Card>
    )
  }

  const isAdmin = active.role === 'admin'

  return (
    // Keyed by Household so switching groups never shows one group's unsaved
    // form values or freshly created invite link under another.
    <div key={active.id} className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      {isAdmin && (
        <Card className="lg:col-span-5">
          <CardHeader>
            <CardTitle>{active.name} settings</CardTitle>
            <CardDescription>
              These apply to everyone in the group and are separate from your
              personal settings.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <HouseholdSettingsForm household={active} />
          </CardContent>
        </Card>
      )}

      <div
        className={
          isAdmin
            ? 'flex flex-col gap-6 lg:col-span-7'
            : 'flex flex-col gap-6 lg:col-span-12'
        }
      >
        <Card>
          <CardHeader>
            <CardTitle>Members</CardTitle>
            <CardDescription>
              Everyone here sees every entry in {active.name}.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <HouseholdMembers household={active} profileId={profile.id} />
          </CardContent>
        </Card>

        {householdService.canInvite(active) && (
          <Card>
            <CardHeader>
              <CardTitle>Invite people</CardTitle>
            </CardHeader>
            <CardContent>
              <HouseholdInvites householdId={active.id} />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
