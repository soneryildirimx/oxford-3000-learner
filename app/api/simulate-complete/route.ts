import { auth } from "@/auth";
import { prisma } from "@/prisma";

export async function POST() {
    const session = await auth();
    if (!session?.user?.id) {
        return Response.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    try {
        // Get all words that haven't been marked as progress for this user
        const words = await prisma.word.findMany({
            where: {
                wordProgress: {
                    none: {
                        userId
                    }
                }
            },
            select: {
                id: true
            }
        });

        // Create progress entries for all words
        const progressEntries = words.map(word => ({
            userId,
            wordId: word.id,
            status: 'correct', // Mark all as correct for simulation
            attemptCount: 1,
            lastReviewedAt: new Date(),
            reviewCount: 1
        }));

        // Insert all progress entries in batches of 100
        const batchSize = 100;
        for (let i = 0; i < progressEntries.length; i += batchSize) {
            const batch = progressEntries.slice(i, i + batchSize);
            await prisma.wordProgress.createMany({
                data: batch
            });
            // Log progress
            console.log(`Processed ${Math.min(i + batchSize, progressEntries.length)} of ${progressEntries.length} words`);
        }

        return Response.json({ 
            message: `Successfully simulated completion of ${words.length} words`
        }, { status: 200 });
    } catch (error) {
        console.error('Error simulating word completion:', error);
        return Response.json({ 
            message: 'Error simulating word completion'
        }, { status: 500 });
    }
} 