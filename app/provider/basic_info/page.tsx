// app/provider/basic_info/page.tsx
import Image from "next/image";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs"; // Needed for Prisma

// Fetch first mother
async function getMother() {
  const mother = await prisma.motherProfile.findFirst({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      preferredName: true,
      deliveryType: true,
      deliveryDate: true,
      photoUrl: true,
      tz: true,
      ppdStage: true,
      createdAt: true,
      updatedAt: true,
      careContacts: {
        select: { name: true, role: true, emailSMS: true, consented: true, lastUsed: true },
      },
    },
  });
  return mother;
}

export default async function BasicInfoPage() {
  const mother = await getMother();
  if (!mother) return <div className="p-6 text-gray-400">No mother data found.</div>;

  const formattedDeliveryDate = new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(
    mother.deliveryDate
  );

  return (
    <main className="h-dvh relative isolate p-6 max-w-5xl mx-auto space-y-8">
      {/* dark background + radial glow */}
      <div className="absolute inset-0 -z-20 bg-neutral-950" />
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(1200px_600px_at_50%_-10%,rgba(168,85,247,0.24),transparent_60%)] pointer-events-none" />

      {/* ===== HEADER ===== */}
      <section className="border">
        <div className="bg-purple-600/26 hover:bg-purple-600/40 backdrop-blur-[1px] py-4 md:py-6 transition-colors rounded-lg">
          <h1 className="text-3xl font-bold text-neutral-50 px-4 md:px-6">Patient Overview</h1>
        </div>
      </section>

      {/* ===== PROFILE GRID ===== */}
      <section className="border rounded-lg p-6 bg-white/10 backdrop-blur-sm shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Profile Photo */}
          <div className="flex justify-center md:justify-start">
            <div className="relative w-48 h-48 rounded-full overflow-hidden ring-2 ring-neutral-300 shadow-sm">
              <Image
                src={mother.photoUrl ?? "/patient-placeholder.jpg"}
                alt={`${mother.preferredName} profile photo`}
                fill
                sizes="192px"
                className="object-cover"
              />
            </div>
          </div>

          {/* Info */}
          <div className="col-span-2 flex flex-col justify-center space-y-3 text-neutral-50">
            <p>
              <span className="font-semibold">Name:</span> {mother.preferredName}
            </p>
            <p>
              <span className="font-semibold">Delivery Type:</span> {mother.deliveryType}
            </p>
            <p>
              <span className="font-semibold">Delivery Date:</span> {formattedDeliveryDate}
            </p>
            <p>
              <span className="font-semibold">Time Zone:</span> {mother.tz ?? "Unknown"}
            </p>
            <p>
              <span className="font-semibold">PPD Stage:</span> {mother.ppdStage}
            </p>
            <p>
              <span className="font-semibold">Created At:</span>{" "}
              {new Intl.DateTimeFormat("en-US", {
                dateStyle: "medium",
                timeStyle: "short",
              }).format(mother.createdAt)}
            </p>
            <p>
              <span className="font-semibold">Last Updated:</span>{" "}
              {new Intl.DateTimeFormat("en-US", {
                dateStyle: "medium",
                timeStyle: "short",
              }).format(mother.updatedAt)}
            </p>
          </div>
        </div>
      </section>

      {/* ===== CARE CONTACTS ===== */}
      <section className="border rounded-lg p-6 bg-white/10 backdrop-blur-sm shadow-sm">
        <h2 className="text-2xl font-semibold mb-4 text-neutral-50">Care Contacts</h2>
        {mother.careContacts.length === 0 ? (
          <p className="text-neutral-300">No care contacts available.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {mother.careContacts.map((c, idx) => (
              <div
                key={idx}
                className="p-4 border rounded-lg bg-black/20 hover:bg-black/30 transition-colors text-neutral-50"
              >
                <p>
                  <span className="font-semibold">{c.name}</span> ({c.role})
                </p>
                <p>{c.emailSMS}</p>
                <p>{c.consented ? "Consented" : "Not Consented"}</p>
                <p>
                  Last Used:{" "}
                  {c.lastUsed
                    ? new Intl.DateTimeFormat("en-US", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      }).format(c.lastUsed)
                    : "Never"}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
