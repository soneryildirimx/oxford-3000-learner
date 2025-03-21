import { auth } from "@/auth";
import { prisma } from "@/prisma";

export async function POST(request: Request) {
    const session = await auth();
    if (!session?.user?.id) {
        return Response.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    try {
        const { wordId, isCorrect, isUnknown } = await request.json();

        if (!wordId) {
            return Response.json({ message: 'Word ID is required' }, { status: 400 });
        }

        const wordProgress = await prisma.wordProgress.upsert({
            where: {
                userId_wordId: {
                    userId,
                    wordId
                }
            },
            update: {
                status: isUnknown ? 'unknown' : (isCorrect ? 'correct' : 'wrong'),
                attemptCount: { increment: 1 },
                lastReviewedAt: new Date(),
                reviewCount: { increment: 1 }
            },
            create: {
                user: {
                    connect: {
                        id: userId
                    }
                },
                word: {
                    connect: {
                        id: wordId
                    }
                },
                status: isUnknown ? 'unknown' : (isCorrect ? 'correct' : 'wrong'),
                attemptCount: 1,
                lastReviewedAt: new Date(),
                reviewCount: 1
            }
        });

        return Response.json(wordProgress, { status: 200 });
    } catch (error) {
        console.error('Error updating word progress:', error);
        return Response.json({ message: 'Internal server error' }, { status: 500 });
    }
} 