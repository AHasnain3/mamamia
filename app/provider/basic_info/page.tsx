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
  if (!mother) return <div>No mother data found.</div>;

  const formattedDeliveryDate = new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
  }).format(mother.deliveryDate);

  return (
    <main className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-4">Patient Overview</h1>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Profile Photo */}
        <div className="flex-shrink-0">
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
        <div className="flex-1 space-y-3">
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
            {new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(
              mother.createdAt
            )}
          </p>
          <p>
            <span className="font-semibold">Last Updated:</span>{" "}
            {new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(
              mother.updatedAt
            )}
          </p>
        </div>
      </div>

      {/* Care Contacts */}
      <section className="mt-8">
        <h2 className="text-2xl font-semibold mb-2">Care Contacts</h2>
        {mother.careContacts.length === 0 ? (
          <p>No care contacts available.</p>
        ) : (
          <ul className="space-y-2">
            {mother.careContacts.map((c, idx) => (
              <li key={idx} className="border rounded p-3 flex flex-col md:flex-row md:justify-between">
                <span>
                  <span className="font-semibold">{c.name}</span> ({c.role})
                </span>
                <span>{c.emailSMS}</span>
                <span>{c.consented ? "Consented" : "Not Consented"}</span>
                <span>
                  Last Used:{" "}
                  {c.lastUsed
                    ? new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(
                        c.lastUsed
                      )
                    : "Never"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
