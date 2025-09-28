// app/api/mothers/lookup/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();
  if (!q) return NextResponse.json({ error: "Missing q" }, { status: 400 });

  // Case-insensitive exact match first
  const mother = await prisma.motherProfile.findFirst({
    where: {
      preferredName: { equals: q, mode: "insensitive" },
    },
    select: { id: true, preferredName: true, photoUrl: true },
  });

  // If you prefer a contains() fallback, uncomment:
  // const mother = await prisma.motherProfile.findFirst({
  //   where: { preferredName: { contains: q, mode: "insensitive" } },
  //   select: { id: true, preferredName: true, photoUrl: true },
  // });

  if (!mother) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(mother);
}
