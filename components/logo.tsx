import Image from "next/image"
import { cn } from "@/lib/utils"

interface LogoProps {
  className?: string
  width?: number
  height?: number
}

export function Logo({ className, width = 120, height = 28 }: LogoProps) {
  return (
    <Image
      src="/DialZero.svg"
      alt="DialZero"
      width={width}
      height={height}
      className={cn("object-contain", className)}
      priority
    />
  )
}
