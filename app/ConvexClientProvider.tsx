"use client";

import { ConvexProvider, ConvexReactClient } from "convex/react";
import { ReactNode } from "react";
import { AuthProvider } from "@/components/AuthProvider";

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL ?? "https://brazen-ox-309.convex.cloud";
const convex = new ConvexReactClient(CONVEX_URL);

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  return (
    <ConvexProvider client={convex}>
      <AuthProvider>{children}</AuthProvider>
    </ConvexProvider>
  );
}
