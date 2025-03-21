import { auth } from "@/auth";
import { prisma } from "@/prisma"

export async function GET() {
    const session = await auth()
    if (!session?.user?.id) {
        return Response.json({message: 'No session found'}, { status: 401 });
    }

    const userId = session.user.id;

    try {
        // First, check for words that haven't been attempted yet
        const newWordsCount = await prisma.word.count({
            where: {
                wordProgress: { none: { userId } },
            },
        });

        // If there are new words, return one of them
        if (newWordsCount > 0) {
            const randomIndex = Math.floor(Math.random() * newWordsCount);
            const randomWord = await prisma.word.findFirst({
                where: {
                    wordProgress: { none: { userId } },
                },
                skip: randomIndex,
            });

            if (!randomWord) {
                return Response.json({ message: 'No word found' }, { status: 404 });
            }

            // Get total words count for progress tracking
            const totalWords = await prisma.word.count();

            // Get incorrect answers logic...
            const incorrectAnswers = await getIncorrectAnswers(randomWord.id);
            if (!incorrectAnswers) {
                return Response.json({ message: 'Could not get incorrect answers' }, { status: 500 });
            }

            // Combine and shuffle answers
            const answers = [
                { text: randomWord.tr, correct: true },
                ...incorrectAnswers.map(word => ({ text: word.tr, correct: false }))
            ].sort(() => Math.random() - 0.5);

            return Response.json({
                id: randomWord.id,
                word: randomWord.en,
                answers,
                totalWords,
                remainingWords: newWordsCount,
                isReview: false
            }, { status: 200 });
        }

        // If no new words, get words from progress that were wrong or unknown
        const reviewWordsCount = await prisma.word.count({
            where: {
                wordProgress: {
                    some: {
                        userId,
                        status: { in: ['wrong', 'unknown'] }
                    }
                }
            }
        });

        if (reviewWordsCount > 0) {
            const randomIndex = Math.floor(Math.random() * reviewWordsCount);
            const reviewWord = await prisma.word.findFirst({
                where: {
                    wordProgress: {
                        some: {
                            userId,
                            status: { in: ['wrong', 'unknown'] }
                        }
                    }
                },
                include: {
                    wordProgress: {
                        where: {
                            userId,
                            status: { in: ['wrong', 'unknown'] }
                        },
                        orderBy: {
                            lastReviewedAt: 'desc'
                        },
                        take: 1
                    }
                },
                skip: randomIndex
            });

            if (reviewWord) {
                const incorrectAnswers = await getIncorrectAnswers(reviewWord.id);
                if (!incorrectAnswers) {
                    return Response.json({ message: 'Could not get incorrect answers' }, { status: 500 });
                }

                const totalWords = await prisma.word.count();
                const answers = [
                    { text: reviewWord.tr, correct: true },
                    ...incorrectAnswers.map(word => ({ text: word.tr, correct: false }))
                ].sort(() => Math.random() - 0.5);

                return Response.json({
                    id: reviewWord.id,
                    word: reviewWord.en,
                    answers,
                    totalWords,
                    remainingWords: reviewWordsCount,
                    isReview: true,
                    lastStatus: reviewWord.wordProgress[0].status
                }, { status: 200 });
            }
        }

        // If no review words either, all words are completed correctly
        const totalWords = await prisma.word.count();
        return Response.json({
            message: 'All words completed successfully!',
            totalWords,
            remainingWords: 0,
            completed: true
        }, { status: 200 });
    } catch (error) {
        console.error('Error fetching word:', error);
        return Response.json({ message: 'Internal server error' }, { status: 500 });
    }
}

async function getIncorrectAnswers(currentWordId: number) {
    const totalIncorrectWords = await prisma.word.count({
        where: {
            NOT: {
                id: currentWordId
            }
        }
    });

    // Function to get a random word
    const getRandomWord = async () => {
        const skipAmount = Math.floor(Math.random() * totalIncorrectWords);
        return prisma.word.findFirst({
            where: {
                NOT: {
                    id: currentWordId
                }
            },
            skip: skipAmount,
            select: {
                tr: true
            }
        });
    };

    // Get two random incorrect answers
    const [incorrect1, incorrect2] = await Promise.all([
        getRandomWord(),
        getRandomWord()
    ]);

    if (!incorrect1 || !incorrect2) {
        return null;
    }

    return [incorrect1, incorrect2];
}
