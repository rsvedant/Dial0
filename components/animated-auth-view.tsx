"use client";

import { motion } from "framer-motion";
import { AuthView } from "@daveyplate/better-auth-ui";

interface AnimatedAuthViewProps {
  path: string;
}

export function AnimatedAuthView({ path }: AnimatedAuthViewProps) {
  return (
    <motion.div
      initial={{ opacity: 0.0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{
        delay: 0.3,
        duration: 0.8,
        ease: "easeInOut",
      }}
      viewport={{ once: true }}
      className="relative flex w-full max-w-md flex-col items-center justify-center gap-6 rounded-3xl border border-white/15 bg-white/10 p-8 backdrop-blur-xl"
    >
      <AuthView path={path} redirectTo="/dashboard" />
    </motion.div>
  );
}
