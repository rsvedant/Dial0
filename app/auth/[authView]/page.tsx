import { Suspense } from "react"
import { authViewPaths } from "@daveyplate/better-auth-ui/server"
import { AuroraBackground } from "@/components/ui/aurora-background"
import { AnimatedAuthView } from "@/components/animated-auth-view"


export function generateStaticParams() {
    return Object.values(authViewPaths).map((path) => ({ authView: path }))
}

function AuthViewFallback() {
    return (
        <div className="relative flex w-full max-w-md flex-col items-center justify-center gap-6 rounded-3xl border border-white/15 bg-white/10 p-8 backdrop-blur-xl">
            <span className="text-sm text-muted-foreground">Loading authentication view…</span>
        </div>
    )
}

export default async function AuthPage({ params }: { params: Promise<{ authView: string }> }) {
    const { authView } = await params

    return (
        <AuroraBackground className="relative overflow-hidden">
            <div className="flex w-full justify-center px-4 py-10 md:px-6">
                <Suspense fallback={<AuthViewFallback />}>
                    <AnimatedAuthView path={authView} />
                </Suspense>
            </div>
        </AuroraBackground>
    )
}