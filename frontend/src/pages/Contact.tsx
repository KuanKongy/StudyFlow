import { ArrowLeft, Github } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function Contact() {
  const navigate = useNavigate();
  const canGoBack = (window.history.state?.idx ?? 0) > 0;

  return (
    <div className="min-h-screen bg-background px-4 py-5 sm:p-6 lg:p-12">
      <div className="max-w-3xl mx-auto">
        <Button
          variant="ghost"
          size="sm"
          className="mb-6"
          onClick={() => (canGoBack ? navigate(-1) : navigate('/login'))}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <Card>
          <CardContent className="prose dark:prose-invert max-w-none p-4 sm:p-8">
            <h1>Contact</h1>
            <p>StudyFlow is operated by Nam Le. For questions, bug reports, feature requests, or anything related to the Terms of Service and Privacy Policy, reach out through the StudyFlow repository on GitHub.</p>
            <p>
              <a
                href="https://github.com/KuanKongy/StudyFlow"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 no-underline"
              >
                <Github className="w-5 h-5" />
                <span>github.com/KuanKongy/StudyFlow</span>
              </a>
            </p>
            <p>The fastest way to get a response is to <a href="https://github.com/KuanKongy/StudyFlow/issues" target="_blank" rel="noopener noreferrer">open an issue</a> describing your question or problem.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
