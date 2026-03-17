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
import { motion } from 'framer-motion';

const perks = [
  'Access curated food & nutrition research',
  'Join community discussions and organizations',
  'Discover trends with data visualization tools',
];

export default function SignupPage() {
  const router = useRouter();
  const { isAuthenticated } = useAppSelector((s) => s.auth);
  const googleAuthMutation = useGoogleAuth();
  const [error, setError] = useState<string | null>(null);

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

  return (
    <div className="lg:grid lg:grid-cols-2 lg:min-h-screen flex flex-col min-h-screen bg-page-bg">
      {/* ── Left brand panel (lg+ only) ── */}
      <div className="hidden lg:flex flex-col justify-between bg-gradient-to-br from-primary to-primary/75 px-12 py-10 text-primary-foreground">
        <div className="flex items-center gap-3">
          <BookOpen className="h-7 w-7" />
          <span
            className="text-[20px] font-bold tracking-tight"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            UPLB KAIN
          </span>
        </div>

        <div className="flex flex-col gap-7">
          <div>
            <h2 className="text-[42px] leading-tight text-primary-foreground">
              Join UPLB KAIN today
            </h2>
            <p className="mt-3 text-[18px] text-primary-foreground/80 leading-relaxed max-w-sm">
              The knowledge archive on food and nutrition security for the UPLB community.
            </p>
          </div>

          <ul className="flex flex-col gap-4">
            {perks.map((perk) => (
              <li
                key={perk}
                className="flex items-start gap-3 text-[16px] text-primary-foreground/90"
              >
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary-foreground/60" />
                {perk}
              </li>
            ))}
          </ul>
        </div>

        <p className="text-[13px] text-primary-foreground/50">
          &copy; {new Date().getFullYear()} UPLB KAIN — Knowledge Archive on Integrated Nutrition
        </p>
      </div>

      {/* ── Right form panel ── */}
      <div className="flex flex-col bg-page-bg">
        {/* Top bar */}
        <div className="flex h-16 items-center px-5 sm:px-8">
          <Link
            href="/"
            className="flex items-center gap-2 text-[15px] text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to home
          </Link>
        </div>

        {/* Centered card */}
        <div className="flex flex-1 items-center justify-center px-4 pb-16 pt-4">
          <motion.div
            className="w-full max-w-md"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
          >
            <Card className="w-full border-border/50 bg-white card-shadow-md rounded-2xl">
              <CardContent className="px-8 py-9 sm:px-10">
                {/* Branding */}
                <div className="flex flex-col items-center gap-5">
                  <div className="flex items-center gap-3">
                    <Image
                      src="/uplb_logo.png"
                      alt="UPLB Logo"
                      width={48}
                      height={48}
                      className="rounded-full ring-1 ring-border"
                    />
                    <Image
                      src="/FaNS_logo.png"
                      alt="FaNS Logo"
                      width={48}
                      height={48}
                      className="rounded-full ring-1 ring-border"
                    />
                  </div>

                  <div className="text-center">
                    <p
                      className="text-[13px] font-semibold tracking-widest uppercase text-kain-green mb-1"
                      style={{ fontFamily: 'var(--font-heading)' }}
                    >
                      UPLB KAIN
                    </p>
                    <h1 className="text-[26px] text-foreground">
                      Create your account
                    </h1>
                    <p className="mt-1 text-[15px] text-muted-foreground">
                      Join UPLB KAIN in one click
                    </p>
                  </div>
                </div>

                {/* Perks — mobile only (left panel shows them on lg+) */}
                <div className="mt-7 rounded-xl bg-muted/40 p-5 lg:hidden">
                  <ul className="flex flex-col gap-3">
                    {perks.map((perk) => (
                      <li
                        key={perk}
                        className="flex items-start gap-2.5 text-[14px] text-muted-foreground"
                      >
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                        {perk}
                      </li>
                    ))}
                  </ul>
                </div>

                <Separator className="my-7" />

                {/* Google Sign-Up */}
                <div className="flex flex-col gap-4">
                  <Button
                    variant="outline"
                    size="lg"
                    className="w-full gap-3 border-border text-[15px] font-medium rounded-xl h-11 transition-colors hover:bg-muted/40"
                    onClick={() => handleGoogleSignup()}
                    disabled={googleAuthMutation.isPending}
                  >
                    {googleAuthMutation.isPending ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24">
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
                    {googleAuthMutation.isPending ? 'Creating account…' : 'Sign up with Google'}
                  </Button>

                  {error && (
                    <p className="text-center text-[14px] text-destructive">{error}</p>
                  )}
                </div>

                <Separator className="my-7" />

                {/* Footer link */}
                <p className="text-center text-[14px] text-muted-foreground">
                  Already have an account?{' '}
                  <Link href="/login" className="font-semibold text-primary hover:underline underline-offset-2">
                    Log in
                  </Link>
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Bottom footer (mobile only) */}
        <footer className="flex justify-center pb-7 lg:hidden">
          <p className="text-[13px] text-muted-foreground">
            &copy; {new Date().getFullYear()} UPLB KAIN — Knowledge Archive on Integrated Nutrition
          </p>
        </footer>
      </div>
    </div>
  );
}
