import { PrismaClient } from "@/app/generated/prisma";

let prisma;

if (!global.prisma) {
  global.prisma = new PrismaClient();
}

prisma = global.prisma;

export default prisma;
