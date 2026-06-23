import { Link } from '@tanstack/react-router'
import { LogOut, Menu as MenuIcon } from 'lucide-react'
import ThemeToggle from './ThemeToggle'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu'
import { useAuth } from '#/features/auth/auth-context'
import { useProfile } from '#/features/profile/use-profile'
import { UserAvatar } from '#/shared/components/UserAvatar'
import type { UserProfile } from '#/features/profile/types'
import type { AuthSession } from '#/features/auth/types'

const Menu: {
  link: string
  label: string
  id: number
}[] = [
  {
    id: 1,
    link: '/dashboard',
    label: 'Dashboard',
  },
  {
    id: 2,
    link: '/reports',
    label: 'Reports',
  },
  {
    id: 3,
    link: '/recurring',
    label: 'Recurring',
  },
  {
    id: 4,
    link: '/settings',
    label: 'Settings',
  },
]

export default function Header() {
  const { session, loading, signOut } = useAuth()
  const { profile } = useProfile()

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--line)] bg-[var(--header-bg)] px-4 backdrop-blur-lg">
      <nav className="page-wrap flex items-center gap-x-3 gap-y-2 py-3 sm:py-4">
        <h2 className="m-0 flex-shrink-0 text-base font-semibold tracking-tight">
          <Link to="/" className="text-sm text-foreground">
            Budget Tracker Logo
          </Link>
        </h2>

        <div className="ml-auto flex items-center gap-4 sm:gap-6">
          {!loading &&
            (session ? (
              <>
                {/* Desktop nav */}
                <div className="hidden items-center gap-6 md:flex">
                  {Menu.map((menu) => (
                    <Link
                      to={menu.link}
                      className="nav-link"
                      activeProps={{ className: 'nav-link is-active' }}
                      key={menu.id}
                    >
                      {menu.label}
                    </Link>
                  ))}
                </div>

                {/* Mobile nav */}
                <div className="md:hidden">
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      aria-label="Open menu"
                      className="flex h-9 w-9 items-center justify-center rounded-md text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <MenuIcon className="size-5" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44">
                      {Menu.map((menu) => (
                        <DropdownMenuItem key={menu.id} asChild>
                          <Link to={menu.link}>{menu.label}</Link>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* User avatar menu */}
                <AvatarDropdown profile={profile} signOut={signOut} />
              </>
            ) : (
              <Link
                to="/login"
                className="nav-link"
                activeProps={{ className: 'nav-link is-active' }}
              >
                Log in
              </Link>
            ))}
          <ThemeToggle />
        </div>
      </nav>
    </header>
  )
}

interface IAvatarDropdown {
  profile: UserProfile | null
  signOut: () => void
}

function AvatarDropdown({ profile, signOut }: IAvatarDropdown) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Open account menu"
        className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <UserAvatar
          name={profile?.displayName}
          email={profile?.email}
          imageUrl={profile?.avatarUrl}
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel className="truncate font-normal text-muted-foreground">
          <div className="flex gap-2">
            <UserAvatar
              name={profile?.displayName}
              email={profile?.email}
              imageUrl={profile?.avatarUrl}
            />
            <div className="flex flex-col">
              <h3 className="text-md font-semibold capitalize">
                {profile?.displayName}
              </h3>
              <span className="text-xs">{profile?.email}</span>
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onSelect={() => void signOut()}>
          <LogOut />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
