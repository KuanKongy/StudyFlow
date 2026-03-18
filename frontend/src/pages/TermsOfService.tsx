import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { TosContent } from '@/components/legal/TosContent';

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-background p-6 lg:p-12">
      <div className="max-w-3xl mx-auto">
        <Link to="/login">
          <Button variant="ghost" size="sm" className="mb-6">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </Link>
        <Card>
          <CardContent className="prose dark:prose-invert max-w-none p-8">
            <TosContent />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
