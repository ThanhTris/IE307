import { Redirect, useRouter } from 'expo-router';
import { VoteScreen, richFlashcardDishes } from '../../features/voting';

/** Development-only: round-1 flashcards filled with every field a card can show (photo, tags, flavours, price). */
export default function DevFlashcardRoute() {
  const router = useRouter();
  if (!__DEV__) return <Redirect href="/" />;
  return <VoteScreen pool={richFlashcardDishes()} initialViewMode="flashcard" showScenarioPicker={false}
    simulateDelayMs={600} onBack={() => router.replace('/')} onGoToFinalRound={() => router.replace('/')} onGoToResult={() => router.replace('/')} onGoToNoConsensus={() => router.replace('/')} />;
}
