// app/api/mothers/auth/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  const { motherId, password } = await req.json();
  if (!motherId || typeof password !== "string") {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const mother = await prisma.motherProfile.findUnique({
    where: { id: Number(motherId) },
    select: { id: true, passwordHash: true },
  });

  if (!mother || !mother.passwordHash) {
    // No password set → treat as invalid
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const ok = await bcrypt.compare(password, mother.passwordHash);
  if (!ok) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  return NextResponse.json({ ok: true });
}
