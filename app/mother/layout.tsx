// app/mother/layout.tsx
import type { ReactNode } from "react";
import CedarProvider from "@/app/cedar-provider"; // ok if you have it; otherwise remove wrapper

export default function MotherLayout({ children }: { children: ReactNode }) {
  return (
    <CedarProvider>
      {/* You can keep global section styles for the page */}
      <div className="min-h-[100dvh] bg-neutral-950 text-neutral-50">
        {children}
      </div>
    </CedarProvider>
  );
}
