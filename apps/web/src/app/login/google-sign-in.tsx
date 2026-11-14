'use client';

import Script from 'next/script';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Spinner } from '@/components/ui';
import { api, errorMessage } from '@/lib/api';

interface GoogleId {
  initialize(cfg: {
    client_id: string;
    callback: (r: { credential: string }) => void;
    ux_mode?: 'popup';
    auto_select?: boolean;
    itp_support?: boolean;
  }): void;
  renderButton(el: HTMLElement, opts: Record<string, unknown>): void;
}
declare global {
  interface Window {
    google?: { accounts: { id: GoogleId } };
  }
}

const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? '';

/** Only allow same-site relative redirects (prevents open-redirect abuse). */
function safeNext(raw: string | null): string {
  return raw && raw.startsWith('/app') && !raw.startsWith('//') ? raw : '/app';
}

export function GoogleSignIn() {
  const router = useRouter();
  const params = useSearchParams();
  const buttonRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onCredential = useCallback(
    async ({ credential }: { credential: string }) => {
      setBusy(true);
      setError(null);
      try {
        await api('/auth/google', { method: 'POST', json: { credential } });
        router.replace(safeNext(params.get('next')));
        router.refresh();
      } catch (err) {
        setError(errorMessage(err));
        setBusy(false);
      }
    },
    [params, router],
  );

  useEffect(() => {
    if (!ready || !window.google || !buttonRef.current || !CLIENT_ID) return;
    window.google.accounts.id.initialize({
      client_id: CLIENT_ID,
      callback: onCredential,
      ux_mode: 'popup',
      itp_support: true,
    });
    window.google.accounts.id.renderButton(buttonRef.current, {
      theme: 'outline',
      size: 'large',
      shape: 'pill',
      text: 'continue_with',
      width: 280,
    });
  }, [ready, onCredential]);

  if (!CLIENT_ID) return <Alert tone="warn">Google sign-in is not configured yet.</Alert>;

  return (
    <div className="flex w-full flex-col items-center gap-4">
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onReady={() => setReady(true)}
      />
      {busy ? <Spinner label="Signing you in…" /> : <div ref={buttonRef} className="min-h-11" />}
      {error && <Alert>{error}</Alert>}
    </div>
  );
}
