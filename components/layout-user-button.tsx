"use client"

import { usePathname } from "next/navigation"
import { UserButton } from "@daveyplate/better-auth-ui"

export default function LayoutUserButton() {
  const pathname = usePathname()
  const hideForLanding = pathname === "/"

  if (hideForLanding) {
    return null
  }

  return (
    <div className="fixed right-2 top-2 z-50 flex items-center gap-2">
      {/* <UserButton className="h-8 w-8" /> */}
    </div>
  )
}
