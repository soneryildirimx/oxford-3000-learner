import { auth, signOut } from "@/auth"; 
import { redirect } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { prisma } from "@/prisma";

type WordStats = {
  correct: number;
  wrong: number;
  unknown: number;
};

async function getStats(userId: string): Promise<WordStats> {
  const stats = await prisma.wordProgress.groupBy({
    by: ['status'],
    where: {
      userId
    },
    _count: true
  });

  const statsMap = stats.reduce((acc: Record<string, number>, curr) => {
    acc[curr.status] = curr._count;
    return acc;
  }, {});

  return {
    correct: statsMap['correct'] || 0,
    wrong: statsMap['wrong'] || 0,
    unknown: statsMap['unknown'] || 0
  };
}

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth();
  if(!session?.user?.id) redirect('/auth');

  const stats = await getStats(session.user.id);
  
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-8">
            <h1 className="text-xl font-semibold">English Vocabulary</h1>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <span className="text-sm font-medium text-green-500">✓ {stats.correct}</span>
                <Separator orientation="vertical" className="h-4" />
                <span className="text-sm font-medium text-red-500">✗ {stats.wrong}</span>
                <Separator orientation="vertical" className="h-4" />
                <span className="text-sm font-medium text-yellow-500">? {stats.unknown}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">{session.user.name}</span>
            <Avatar>
              <AvatarImage src={session.user.image || undefined} />
              <AvatarFallback>{session.user.name?.[0]?.toUpperCase() || '?'}</AvatarFallback>
            </Avatar>
            <form action={async () => { 'use server'; await signOut(); }}>
              <Button variant="ghost" size="sm" type="submit">
                Sign out
              </Button>
            </form>
          </div>
        </div>
      </header>
      <main className="container py-6 px-4">
        {children}
      </main>
    </div>
  );
}
