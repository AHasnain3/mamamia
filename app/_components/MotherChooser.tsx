// app/_components/MotherChooser.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { X } from "lucide-react";

// Local type (Option B)
type MotherLite = { id: number; preferredName: string | null; photoUrl: string | null };

export default function MotherChooser({
  mothers,
  children,
}: {
  mothers: MotherLite[];
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen(true)}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setOpen(true)}
        className="block w-full text-left"
        >
        {children}
        </div>


      {open && (
        <div className="fixed inset-0 z-50">
          {/* backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          {/* modal */}
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-neutral-900 p-5 shadow-xl">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-base font-semibold text-white">Choose your profile</h3>
                <button
                  onClick={() => setOpen(false)}
                  className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-neutral-200 hover:bg-white/10"
                >
                  <X className="h-4 w-4" />
                  Close
                </button>
              </div>

              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {mothers.map((m) => {
                  const name = m.preferredName?.trim() || `Mother #${m.id}`;
                  const photo = m.photoUrl || "/patient-placeholder.jpg";
                  return (
                    <li key={m.id}>
                      <Link
                        href={`/mother?motherId=${m.id}`}
                        className="group flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3 hover:bg-white/10 transition"
                        onClick={() => setOpen(false)}
                      >
                        <div className="relative h-10 w-10 overflow-hidden rounded-full ring-1 ring-white/20">
                          <Image
                            src={photo}
                            alt={name}
                            fill
                            sizes="40px"
                            className="object-cover"
                          />
                        </div>
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium text-white">{name}</div>
                          <div className="text-xs text-neutral-400">Tap to continue →</div>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>

              <div className="mt-4 text-xs text-neutral-400">
                Don’t see your name? Contact your provider to add your profile.
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
