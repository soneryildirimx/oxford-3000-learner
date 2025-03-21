"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { fetcher } from "@/lib/utils";
import useSWR from "swr";
import { useState, useEffect } from "react";

type Answer = {
  text: string;
  correct: boolean;
};

type WordResponse = {
  id?: number;
  word?: string;
  answers?: Answer[];
  totalWords: number;
  remainingWords: number;
  completed?: boolean;
  message?: string;
  isReview?: boolean;
  lastStatus?: string;
};

export default function App() {
  const { data, isLoading, error, mutate } = useSWR<WordResponse>("/api/words", fetcher);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [isUnknown, setIsUnknown] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isSimulating, setIsSimulating] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    if (data?.totalWords) {
      const completed = data.totalWords - (data.remainingWords || 0);
      setProgress((completed / data.totalWords) * 100);
    }
  }, [data?.totalWords, data?.remainingWords]);

  if (isLoading) return <div>loading</div>;
  if (!data) return <div>Error: {error?.message}</div>;

  const handleAnswerSelect = async (index: number) => {
    if (!data.word || !data.id || !data.answers) return;
    
    setSelectedAnswer(index);
    setShowResult(true);
    setIsUnknown(false);

    try {
      await fetch('/api/word-progress', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          wordId: data.id,
          isCorrect: data.answers[index].correct,
          isUnknown: false
        })
      });
    } catch (error) {
      console.error('Failed to save progress:', error);
    }
  };

  const handleUnknown = async () => {
    if (!data.word || !data.id) return;

    setShowResult(true);
    setIsUnknown(true);

    try {
      await fetch('/api/word-progress', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          wordId: data.id,
          isCorrect: false,
          isUnknown: true
        })
      });
    } catch (error) {
      console.error('Failed to save progress:', error);
    }
  };

  const handleNextWord = () => {
    setSelectedAnswer(null);
    setShowResult(false);
    setIsUnknown(false);
    mutate();
  };

  const handleSimulateCompletion = async () => {
    setIsSimulating(true);
    try {
      await fetch('/api/simulate-complete', {
        method: 'POST'
      });
      mutate();
    } catch (error) {
      console.error('Failed to simulate completion:', error);
    }
    setIsSimulating(false);
  };

  const handleReset = async () => {
    setIsResetting(true);
    try {
      await fetch('/api/reset', {
        method: 'POST'
      });
      mutate();
    } catch (error) {
      console.error('Failed to reset progress:', error);
    }
    setIsResetting(false);
  };

  return (
    <div className="max-w-lg mx-auto">
      <Card className="relative">
        <div className="absolute right-4 top-4 flex gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleSimulateCompletion}
            disabled={isSimulating || data.completed || isResetting}
          >
            {isSimulating ? 'Simulating...' : 'Simulate Complete'}
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleReset}
            disabled={isResetting || isSimulating}
          >
            {isResetting ? 'Resetting...' : 'Reset Progress'}
          </Button>
        </div>
        <div className="p-6 pb-0">
          <Progress value={progress} className="mb-2" />
          <p className="text-sm text-muted-foreground mb-4">
            {data.totalWords - data.remainingWords} of {data.totalWords} words completed
          </p>
        </div>
        {data.completed ? (
          <CardContent className="flex flex-col items-center gap-4 py-8">
            <CardTitle className="text-2xl">🎉 Congratulations!</CardTitle>
            <CardDescription>
              You have completed all {data.totalWords} words correctly!
            </CardDescription>
          </CardContent>
        ) : (
          <>
            <CardHeader>
              {data.isReview && (
                <div className="mb-4">
                  <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${
                    data.lastStatus === 'wrong' 
                      ? 'bg-destructive/10 text-destructive' 
                      : 'bg-yellow-500/10 text-yellow-500'
                  }`}>
                    {data.lastStatus === 'wrong' ? 'Previously Wrong' : 'Previously Unknown'}
                  </span>
                </div>
              )}
              <CardTitle className="text-2xl mb-4">{data.word}</CardTitle>
              <CardDescription>
                {data.isReview 
                  ? "Let's review this word. Choose the correct Turkish translation:"
                  : "Choose the correct Turkish translation"}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {data.answers?.map((answer, index) => (
                <Button
                  key={index}
                  variant={
                    showResult
                      ? answer.correct
                        ? "default"
                        : selectedAnswer === index
                        ? "destructive"
                        : "outline"
                      : selectedAnswer === index
                      ? "default"
                      : "outline"
                  }
                  className="w-full"
                  onClick={() => !showResult && handleAnswerSelect(index)}
                  disabled={showResult}
                >
                  {answer.text}
                </Button>
              ))}
              <Button
                variant={isUnknown ? "destructive" : "outline"}
                className="w-full"
                onClick={() => !showResult && handleUnknown()}
                disabled={showResult}
              >
                I don't know
              </Button>
            </CardContent>
            <CardFooter className="flex justify-center">
              {showResult && (
                <div className="flex flex-col items-center gap-2">
                  {isUnknown && (
                    <p className="text-muted-foreground mb-2">
                      The correct answer was: {data.answers?.find(a => a.correct)?.text}
                    </p>
                  )}
                  <Button onClick={handleNextWord}>
                    Next Word
                  </Button>
                </div>
              )}
            </CardFooter>
          </>
        )}
      </Card>
    </div>
  );
}
