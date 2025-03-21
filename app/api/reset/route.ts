import { auth } from "@/auth";
import { prisma } from "@/prisma";
import { NextResponse } from "next/server";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    // Delete all word progress for the user
    await prisma.wordProgress.deleteMany({
      where: {
        userId: session.user.id
      }
    });

    return NextResponse.json({ message: "Progress reset successfully" });
  } catch (error) {
    console.error("Failed to reset progress:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
} 