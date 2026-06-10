'use client';

import Link from 'next/link';
import { Home, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-default-50 flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <p className="text-8xl font-bold text-default-200 mb-4">404</p>
        <h1 className="text-2xl font-bold text-foreground mb-2">Page not found</h1>
        <p className="text-default-500 mb-8">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <div className="flex gap-3 justify-center">
          <Button
            as={Link}
            href="/"
            color="primary"
            startContent={<Home className="w-4 h-4" />}
          >
            Go to Dashboard
          </Button>
          <Button
            variant="bordered"
            onClick={() => window.history.back()}
            startContent={<ArrowLeft className="w-4 h-4" />}
          >
            Go Back
          </Button>
        </div>
      </div>
    </div>
  );
}
