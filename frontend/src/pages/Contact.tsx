import type { ReactNode } from 'react';
import { ArrowUpRight, Github, Linkedin, Mail, type LucideIcon } from 'lucide-react';
import { toast } from 'sonner';
import { BackButton } from '@/components/BackButton';
import { Card, CardContent } from '@/components/ui/card';

const EMAIL = 'khanhpronam@gmail.com';
const actionClass = 'inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline';

function ContactCard({
  icon: Icon,
  title,
  body,
  action,
}: {
  icon: LucideIcon;
  title: string;
  body: string;
  action: ReactNode;
}) {
  return (
    <Card className="flex flex-col">
      <CardContent className="flex flex-1 flex-col gap-2 p-5">
        <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
        <h2 className="text-base font-semibold">{title}</h2>
        <p className="flex-1 text-sm text-muted-foreground">{body}</p>
        <div>{action}</div>
      </CardContent>
    </Card>
  );
}

export default function Contact() {
  async function copyEmail() {
    try {
      await navigator.clipboard.writeText(EMAIL);
      toast.success('Email copied to clipboard');
    } catch {
      window.location.href = `mailto:${EMAIL}`;
    }
  }

  return (
    <div className="min-h-screen bg-background px-4 py-5 sm:p-6 lg:p-12">
      <div className="max-w-3xl mx-auto">
        <BackButton />
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight">Get in touch</h1>
          <p className="mt-1 text-muted-foreground">
            Found a bug, have an idea, or want to talk about StudyFlow?
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <ContactCard
            icon={Github}
            title="GitHub"
            body="Follow development, browse the source, open an issue, or contribute."
            action={
              <a
                href="https://github.com/KuanKongy/StudyFlow"
                target="_blank"
                rel="noopener noreferrer"
                className={actionClass}
              >
                View on GitHub
                <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
              </a>
            }
          />
          <ContactCard
            icon={Linkedin}
            title="LinkedIn"
            body="Connect with Nam and follow the person behind the project."
            action={
              <a
                href="https://www.linkedin.com/in/kuankongy/"
                target="_blank"
                rel="noopener noreferrer"
                className={actionClass}
              >
                Connect on LinkedIn
                <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
              </a>
            }
          />
          <ContactCard
            icon={Mail}
            title="Email"
            body="For anything that doesn't fit GitHub: questions, feedback, or collaboration."
            action={
              <button type="button" onClick={copyEmail} className={actionClass}>
                Copy email address
                <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            }
          />
        </div>
        <p className="mt-8 text-center text-sm text-muted-foreground">
          <span className="font-medium text-foreground">StudyFlow</span> — an independent project
          built and maintained by Nam Le.
        </p>
      </div>
    </div>
  );
}
