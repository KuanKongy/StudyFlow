import { BackButton } from '@/components/BackButton';
import { Card, CardContent } from '@/components/ui/card';
import { TosContent } from '@/components/legal/TosContent';

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-background px-4 py-5 sm:p-6 lg:p-12">
      <div className="max-w-3xl mx-auto">
        <BackButton />
        <Card>
          <CardContent className="prose dark:prose-invert max-w-none p-4 sm:p-8">
            <TosContent />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
