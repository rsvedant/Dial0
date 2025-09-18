"use client"

import { Home, Inbox, User } from "lucide-react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

export function MobileTabBar() {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()

  const isActive = (match: string | RegExp) => {
    if (typeof match === "string") return pathname === match
    return match.test(pathname)
  }

  const onHome = pathname === "/"
  const chatActive = onHome && !!searchParams.get("issueId")
  const onSupportedRoute = onHome || /^\/profile(\/.*)?$/.test(pathname) || /^\/activity(\/.*)?$/.test(pathname)

  if (!onSupportedRoute || chatActive) return null

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 lg:hidden bg-background/80 backdrop-blur-xl border-t border-border safe-bottom">
      <div className="mx-auto max-w-3xl px-6">
        <div className="grid grid-cols-3 gap-2 py-3">
          <button
            aria-label="Home"
            aria-current={isActive(/^\/$/) ? "page" : undefined}
            onClick={() => router.push("/")}
            className="flex flex-col items-center gap-1 text-xs"
          >
            <Home className={`h-5 w-5 ${isActive(/^\/$/) ? "text-primary" : "text-muted-foreground"}`} />
            <span className={`${isActive(/^\/$/) ? "text-primary" : "text-muted-foreground"}`}>Home</span>
          </button>
          <button
            aria-label="Activity"
            aria-current={isActive(/^\/activity(\/.*)?$/) ? "page" : undefined}
            onClick={() => router.push("/activity")}
            className="flex flex-col items-center gap-1 text-xs"
          >
            <Inbox className={`h-5 w-5 ${isActive(/^\/activity(\/.*)?$/) ? "text-primary" : "text-muted-foreground"}`} />
            <span className={`${isActive(/^\/activity(\/.*)?$/) ? "text-primary" : "text-muted-foreground"}`}>Activity</span>
          </button>
          <button
            aria-label="Profile"
            aria-current={isActive(/^\/profile(\/.*)?$/) ? "page" : undefined}
            onClick={() => router.push("/profile")}
            className="flex flex-col items-center gap-1 text-xs"
          >
            <User className={`h-5 w-5 ${isActive(/^\/profile(\/.*)?$/) ? "text-primary" : "text-muted-foreground"}`} />
            <span className={`${isActive(/^\/profile(\/.*)?$/) ? "text-primary" : "text-muted-foreground"}`}>Profile</span>
          </button>
        </div>
      </div>
    </nav>
  )
}


