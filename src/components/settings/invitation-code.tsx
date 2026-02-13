
'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Copy, Check, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

interface InvitationCodeProps {
  code: string;
  onCopy: () => void;
}

export const InvitationCode = ({ code, onCopy }: InvitationCodeProps) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    onCopy();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Code d&apos;Invitation
        </CardTitle>
        <CardDescription>
          Partagez ce code avec vos collaborateurs pour leur permettre de rejoindre votre école.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2">
          <code className="flex-1 bg-white dark:bg-card px-4 py-3 rounded-md border font-mono text-lg tracking-wider text-center">
            {code}
          </code>
          <Button
            variant={copied ? "default" : "outline"}
            onClick={handleCopy}
            className="shrink-0"
          >
            {copied ? (
              <span className="flex items-center gap-2">
                <Check className="h-4 w-4" />
                Copié !
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Copy className="h-4 w-4" />
                Copier
              </span>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
