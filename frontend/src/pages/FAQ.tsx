import { BackButton } from '@/components/BackButton';
import { FaqContent } from '@/components/FaqContent';

export default function FAQ() {
  return (
    <div className="min-h-screen bg-background px-4 py-5 sm:p-6 lg:p-12">
      <div className="max-w-3xl mx-auto">
        <BackButton />
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight">FAQ</h1>
          <p className="mt-1 text-muted-foreground">
            Quick answers about StudyFlow — groups, notes, and the AI features.
          </p>
        </div>
        <FaqContent />
      </div>
    </div>
  );
}
