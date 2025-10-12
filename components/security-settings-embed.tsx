"use client"

import { ChangePasswordCard, ProvidersCard, TwoFactorCard, PasskeysCard, SessionsCard, DeleteAccountCard } from "@daveyplate/better-auth-ui"

export function SecuritySettingsEmbed() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold">Security Settings</h3>
        <p className="text-sm text-muted-foreground mt-1">Manage password, sessions, providers & account protection.</p>
      </div>
      
      <div className="flex flex-col gap-6">
        <ChangePasswordCard />
        <ProvidersCard />
        <TwoFactorCard />
        <PasskeysCard />
        <SessionsCard />
        <DeleteAccountCard />
      </div>
    </div>
  )
}
