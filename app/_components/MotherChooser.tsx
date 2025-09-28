// app/_components/MotherChooser.tsx
"use client";

import { useState } from "react";
import Image from "next/image";
import { X, Search, Lock } from "lucide-react";
import { useRouter } from "next/navigation";

// Define the shape locally so we don't import from ../page
type MotherLite = { id: number; preferredName: string | null; photoUrl: string | null };

async function lookupMotherByName(name: string) {
  const res = await fetch(`/api/mothers/lookup?q=${encodeURIComponent(name)}`, { cache: "no-store" });
  if (!res.ok) return null;
  return (await res.json()) as MotherLite | null;
}

async function authMother(motherId: number, password: string) {
  const res = await fetch(`/api/mothers/auth`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ motherId, password }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error || "Authentication failed");
  }
  return (await res.json()) as { ok: true };
}

export default function MotherChooser({
  mothers, // not used now for suggestions, but keeping prop is fine
  children,
}: {
  mothers: MotherLite[];
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  // step 1: name prompt
  const [nameInput, setNameInput] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);

  // result of name lookup
  const [found, setFound] = useState<MotherLite | null>(null);

  // step 2: password
  const [askPassword, setAskPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [passError, setPassError] = useState<string | null>(null);
  const [authing, setAuthing] = useState(false);

  const router = useRouter();

  function resetAll() {
    setNameInput("");
    setNameError(null);
    setSearching(false);
    setFound(null);
    setAskPassword(false);
    setPassword("");
    setPassError(null);
    setAuthing(false);
  }

  async function onFind(e?: React.FormEvent) {
    e?.preventDefault();
    const q = nameInput.trim();
    if (!q) {
      setNameError("Please enter a name.");
      return;
    }
    setSearching(true);
    setNameError(null);
    try {
      const m = await lookupMotherByName(q);
      if (!m) {
        setFound(null);
        setAskPassword(false);
        setNameError("We couldn’t find that name. Try again.");
      } else {
        setFound(m);
        setAskPassword(false);
        setPassword("");
        setPassError(null);
      }
    } finally {
      setSearching(false);
    }
  }

  async function onAuth(e?: React.FormEvent) {
    e?.preventDefault();
    if (!found) return;
    const pw = password.trim();
    if (!pw) {
      setPassError("Enter your password.");
      return;
    }
    setAuthing(true);
    setPassError(null);
    try {
      await authMother(found.id, pw);
      setOpen(false);
      resetAll();
      router.push(`/mother?motherId=${found.id}`);
    } catch (err: any) {
      setPassError(err?.message || "Incorrect password. Try again.");
    } finally {
      setAuthing(false);
    }
  }

  return (
    <>
      {/* trigger; keep card sizing identical */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen(true)}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setOpen(true)}
        className="block w-full h-full text-left"
      >
        {children}
      </div>

      {!open ? null : (
        <div className="fixed inset-0 z-50">
          {/* backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => {
              setOpen(false);
              resetAll();
            }}
          />
          {/* modal */}
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-neutral-900 p-5 shadow-xl">
              {/* header */}
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-base font-semibold text-white">
                  {found && askPassword ? "Enter password" : "Who are you?"}
                </h3>
                <button
                  onClick={() => {
                    setOpen(false);
                    resetAll();
                  }}
                  className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-neutral-200 hover:bg-white/10"
                >
                  <X className="h-4 w-4" />
                  Close
                </button>
              </div>

              {/* Step 1: Name prompt (no suggestions, no 'e.g.,' placeholder) */}
              {!found && (
                <form onSubmit={onFind} className="space-y-2">
                  <label className="block text-sm text-neutral-300">Type your first name</label>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <input
                        value={nameInput}
                        onChange={(e) => setNameInput(e.target.value)}
                        placeholder=""
                        className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 pr-9 text-sm text-white outline-none placeholder:text-neutral-400"
                        autoComplete="given-name"
                        aria-label="First name"
                      />
                      <Search className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                    </div>
                    <button
                      type="submit"
                      disabled={searching}
                      className="rounded-lg bg-purple-500 px-3 py-2 text-sm font-medium text-white hover:bg-purple-400 disabled:opacity-60"
                    >
                      {searching ? "Searching…" : "Find"}
                    </button>
                  </div>
                  {nameError && <div className="text-xs text-rose-300">{nameError}</div>}
                </form>
              )}

              {/* Step 1.5: Found → show bubble & continue */}
              {found && !askPassword && (
                <div className="space-y-3">
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => setAskPassword(true)}
                    onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setAskPassword(true)}
                    className="group flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3 hover:bg-white/10 transition cursor-pointer"
                  >
                    <div className="relative h-12 w-12 overflow-hidden rounded-full ring-1 ring-white/20">
                      <Image
                        src={found.photoUrl || "/patient-placeholder.jpg"}
                        alt={found.preferredName || `Mother #${found.id}`}
                        fill
                        sizes="48px"
                        className="object-cover"
                      />
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-lg font-semibold text-white">
                        {found.preferredName || `Mother #${found.id}`}
                      </div>
                      <div className="text-sm text-neutral-400">Tap to continue →</div>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setFound(null);
                      setAskPassword(false);
                      setPassword("");
                      setNameError(null);
                    }}
                    className="text-xs text-neutral-300 hover:text-white"
                  >
                    Not you? Try another name
                  </button>
                </div>
              )}

              {/* Step 2: Password */}
              {found && askPassword && (
                <form onSubmit={onAuth} className="mt-1 space-y-2">
                  <label className="block text-sm text-neutral-300">
                    Enter password for{" "}
                    <span className="font-medium">
                      {found.preferredName || `Mother #${found.id}`}
                    </span>
                  </label>
                  <div className="relative">
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 pr-9 text-sm text-white outline-none placeholder:text-neutral-400"
                    />
                    <Lock className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                  </div>
                  {passError && <div className="text-xs text-rose-300">{passError}</div>}
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="submit"
                      disabled={authing}
                      className="rounded-lg bg-purple-500 px-3 py-2 text-sm font-medium text-white hover:bg-purple-400 disabled:opacity-60"
                    >
                      {authing ? "Checking…" : "Continue"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAskPassword(false);
                        setPassword("");
                        setPassError(null);
                      }}
                      className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-neutral-200 hover:bg-white/10"
                    >
                      Back
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
