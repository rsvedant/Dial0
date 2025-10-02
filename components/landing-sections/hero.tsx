"use client";

import { GL } from "../gl";

export function Hero({ hovering = false }: { hovering?: boolean }) {
  return <GL hovering={hovering} />;
}
