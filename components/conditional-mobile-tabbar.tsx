"use client"

import { usePathname } from "next/navigation"
import { MobileTabBar } from "@/components/mobile-tabbar"

export function ConditionalMobileTabbar() {
  const pathname = usePathname()
  if (pathname === "/") return null
  return <MobileTabBar />
}
