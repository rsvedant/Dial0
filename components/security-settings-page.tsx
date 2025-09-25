"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { RedirectToSignIn, SignedIn, ProvidersCard, SessionsCard, DeleteAccountCard, ChangePasswordCard, TwoFactorCard, PasskeysCard } from "@daveyplate/better-auth-ui"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import type { IssueListItem } from "@/types/issue"
import { IssuesSidebar } from "@/components/issues-sidebar"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Logo } from "@/components/logo"
import { Menu } from "lucide-react"

export function SecuritySettingsPage() {
  const convexIssues = useQuery(api.orchestration.listIssuesWithMeta, {}) as any[] | undefined
  const router = useRouter()
  const issues: IssueListItem[] = React.useMemo(() => {
    if (!convexIssues) return []
    return convexIssues.map((doc: any) => ({
      id: doc._id,
      title: doc.title,
      status: doc.status,
      createdAt: new Date(doc.createdAt),
      messages: [],
      messageCount: doc.messageCount,
      lastMessage: doc.lastMessage,
    }))
  }, [convexIssues])
  const [sidebarOpen, setSidebarOpen] = React.useState(false)
  return (
    <>
      <RedirectToSignIn />
      <SignedIn>
        <div className="h-screen overflow-y-auto ios-scroll scroll-container bg-background lg:pl-64">
          <div className="fixed top-0 left-0 right-0 z-30 flex items-center justify-between safe-area bg-background/95 backdrop-blur-sm ios-no-bounce ios-mobile-header px-4 lg:hidden">
            <Button variant="ghost" size="sm" onClick={() => setSidebarOpen(true)} className="animate-scale-in h-12 w-12 p-0 ios-button icon-only large scale-150 lg:scale-100"><Menu className="h-6 w-6" /></Button>
            <Logo width={120} height={30} />
            <div className="w-12" />
          </div>
          {sidebarOpen && (<div className="fixed inset-0 bg-black/20 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />)}
          <div className={`fixed inset-y-0 left-0 z-50 w-64 h-screen transform ios-transition ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>
            <IssuesSidebar
              issues={issues as any}
              selectedIssueId={null}
              onSelectIssue={(id) => { router.push(`/dashboard?issueId=${id}`) }}
              onGoHome={() => router.push("/dashboard")}
              onCloseSidebar={() => setSidebarOpen(false)}
              disableAnimation
            />
          </div>
          <div className="mx-auto max-w-3xl px-6 pt-20 lg:pt-6 pb-24">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="mb-6"
            >
              <h1 className="text-2xl font-semibold tracking-tight">Security</h1>
              <p className="text-sm text-muted-foreground mt-1">Manage password, sessions, providers & account protection.</p>
            </motion.div>
            <div className="flex flex-col gap-6">
              {[<ChangePasswordCard key="pw" />, <ProvidersCard key="prov" />, <TwoFactorCard key="2fa" />, <PasskeysCard key="passkeys" />, <SessionsCard key="sessions" />, <DeleteAccountCard key="delete" />].map((node, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.05 * i, ease: [0.16, 1, 0.3, 1] }}
                >
                  {node}
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </SignedIn>
    </>
  )
}
