import { authViewPaths } from "@daveyplate/better-auth-ui/server"
import { AuroraBackground } from "@/components/ui/aurora-background"
import { AnimatedAuthView } from "@/components/animated-auth-view"

export const dynamicParams = false

export function generateStaticParams() {
    return Object.values(authViewPaths).map((path) => ({ authView: path }))
}

export default async function AuthPage({ params }: { params: Promise<{ authView: string }> }) {
    const { authView } = await params

    return (
        <AuroraBackground className="relative overflow-hidden">
            <div className="flex w-full justify-center px-4 py-10 md:px-6">
                <AnimatedAuthView path={authView} />
            </div>
        </AuroraBackground>
    )
}