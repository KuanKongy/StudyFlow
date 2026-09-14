import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

/** Back button for public pages: returns to the referring page when this app
 *  put an entry in the history stack, otherwise falls back to a fixed route. */
export function BackButton({ fallback = '/login' }: { fallback?: string }) {
  const navigate = useNavigate();
  const canGoBack = (window.history.state?.idx ?? 0) > 0;

  return (
    <Button
      variant="ghost"
      size="sm"
      className="mb-6"
      onClick={() => (canGoBack ? navigate(-1) : navigate(fallback))}
    >
      <ArrowLeft className="w-4 h-4 mr-2" />
      Back
    </Button>
  );
}
