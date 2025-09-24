import { AccountView } from "@daveyplate/better-auth-ui"
import { accountViewPaths } from "@daveyplate/better-auth-ui/server"
import { AccountSettingsPage } from "@/components/account-settings-page"
import { SecuritySettingsPage } from "@/components/security-settings-page"

export const dynamicParams = false

export function generateStaticParams() {
    return Object.values(accountViewPaths).map((path) => ({ path }))
}

export default async function AccountPage({ params }: { params: Promise<{ path: string }> }) {
    const { path } = await params

    if (path === accountViewPaths.SETTINGS || path === 'settings') {
        return <AccountSettingsPage />
    }
    if (path === 'security') {
        return <SecuritySettingsPage />
    }
    return (
        <main className="container p-4 md:p-6">
            <AccountView path={path} />
        </main>
    )
}