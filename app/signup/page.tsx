'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useGoogleLogin } from '@react-oauth/google';
import { useGoogleAuth } from '@/lib/api/auth';
import { useAppSelector } from '@/store/hooks';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, BookOpen, CheckCircle2, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function SignupPage() {
  const router = useRouter();
  const { isAuthenticated } = useAppSelector((s) => s.auth);
  const googleAuthMutation = useGoogleAuth();
  const [error, setError] = useState<string | null>(null);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      router.replace('/');
    }
  }, [isAuthenticated, router]);

  const handleGoogleSignup = useGoogleLogin({
    flow: 'implicit',
    onSuccess: async (tokenResponse) => {
      try {
        setError(null);
        await googleAuthMutation.mutateAsync({
          credential: tokenResponse.access_token,
        });
        router.push('/');
      } catch {
        setError('Sign-up failed. Please try again.');
      }
    },
    onError: () => {
      setError('Google sign-in was cancelled or failed.');
    },
  });

  const perks = [
    'Access curated food & nutrition research',
    'Join community discussions and organizations',
    'Discover trends with data visualization tools',
  ];

  return (
    <div className="lg:grid lg:grid-cols-2 lg:min-h-screen flex flex-col min-h-screen bg-background">
      {/* ── Left brand panel (lg+ only) ── */}
      <div className="hidden lg:flex flex-col justify-between bg-gradient-to-br from-primary to-primary/70 px-12 py-10 text-primary-foreground">
        <div className="flex items-center gap-3">
          <BookOpen className="h-7 w-7" />
          <span className="text-[20px] font-bold tracking-tight">UPLB KAIN</span>
        </div>

        <div className="flex flex-col gap-7">
          <div>
            <h2 className="text-[42px] font-bold leading-tight">
              Join UPLB KAIN today
            </h2>
            <p className="mt-3 text-[18px] text-primary-foreground/80 leading-relaxed max-w-sm">
              The knowledge archive on food and nutrition security for the UPLB community.
            </p>
          </div>

          <ul className="flex flex-col gap-4">
            {perks.map((perk) => (
              <li key={perk} className="flex items-start gap-3 text-[16px] text-primary-foreground/90">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary-foreground/70" />
                {perk}
              </li>
            ))}
          </ul>
        </div>

        <p className="text-[14px] text-primary-foreground/60">
          &copy; {new Date().getFullYear()} UPLB KAIN — Knowledge Archive on Integrated Nutrition
        </p>
      </div>

      {/* ── Right form panel ── */}
      <div className="flex flex-col">
        {/* Top bar */}
        <div className="flex h-16 items-center px-5 sm:px-7">
          <Link
            href="/"
            className="flex items-center gap-2.5 text-[16px] text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-5 w-5" />
            Back to home
          </Link>
        </div>

        {/* Centered card */}
        <div className="flex flex-1 items-center justify-center px-4 pb-16">
          <Card className="w-full max-w-md border-border/60 shadow-lg">
            <CardContent className="p-9">
              {/* Branding */}
              <div className="flex flex-col items-center gap-5">
                <div className="flex items-center gap-3.5">
                  <Image
                    src="/uplb_logo.png"
                    alt="UPLB Logo"
                    width={50}
                    height={50}
                    className="rounded-full"
                  />
                  <Image
                    src="/FaNS_logo.png"
                    alt="FaNS Logo"
                    width={50}
                    height={50}
                    className="rounded-full"
                  />
                </div>
                <div className="text-center">
                  <h1 className="text-[28px] font-bold tracking-tight text-foreground">
                    Create your account
                  </h1>
                  <p className="mt-1 text-[16px] text-muted-foreground">
                    Join UPLB KAIN in one click
                  </p>
                </div>
              </div>

              {/* Perks (mobile only — hidden on lg+ since left panel shows them) */}
              <div className="mt-7 rounded-lg bg-muted/40 p-5 lg:hidden">
                <ul className="flex flex-col gap-3">
                  {perks.map((perk) => (
                    <li
                      key={perk}
                      className="flex items-start gap-2.5 text-[16px] text-muted-foreground"
                    >
                      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                      {perk}
                    </li>
                  ))}
                </ul>
              </div>

              <Separator className="my-7" />

              {/* Google Sign-Up */}
              <div className="flex flex-col gap-5">
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full gap-3.5 border-border text-[16px] font-medium"
                  onClick={() => handleGoogleSignup()}
                  disabled={googleAuthMutation.isPending}
                >
                  {googleAuthMutation.isPending ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                  ) : (
                    <svg className="h-6 w-6" viewBox="0 0 24 24">
                      <path
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                        fill="#4285F4"
                      />
                      <path
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        fill="#34A853"
                      />
                      <path
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        fill="#FBBC05"
                      />
                      <path
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        fill="#EA4335"
                      />
                    </svg>
                  )}
                  {googleAuthMutation.isPending
                    ? 'Creating account…'
                    : 'Sign up with Google'}
                </Button>

                {error && (
                  <p className="text-center text-[16px] text-destructive">{error}</p>
                )}
              </div>

              <Separator className="my-7" />

              {/* Footer link */}
              <p className="text-center text-[16px] text-muted-foreground">
                Already have an account?{' '}
                <Link
                  href="/login"
                  className="font-medium text-primary hover:underline"
                >
                  Log in
                </Link>
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Bottom footer (mobile only) */}
        <footer className="flex justify-center pb-7 lg:hidden">
          <p className="text-[14px] text-muted-foreground">
            &copy; {new Date().getFullYear()} UPLB KAIN — Knowledge Archive on
            Integrated Nutrition
          </p>
        </footer>
      </div>
    </div>
  );
}
