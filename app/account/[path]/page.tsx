"use client"

import { AccountView, RedirectToSignIn, SignedIn } from "@daveyplate/better-auth-ui"
import { accountViewPaths } from "@daveyplate/better-auth-ui/server"
import { AccountSettingsPage } from "@/components/account-settings-page"
import { SecuritySettingsPage } from "@/components/security-settings-page"
import { use } from "react"

export const dynamicParams = false

export default function AccountPage({ params }: { params: Promise<{ path: string }> }) {
    const { path } = use(params)

    if (path === accountViewPaths.SETTINGS || path === 'settings') {
        return <AccountSettingsPage />
    }
    if (path === 'security') {
        return <SecuritySettingsPage />
    }
    return (
        <>
            <RedirectToSignIn />
            <SignedIn>
                <main className="container p-4 md:p-6">
                    <AccountView path={path} />
                </main>
            </SignedIn>
        </>
    )
}