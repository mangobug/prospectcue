import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase/server';
import type { EmailOtpType } from '@supabase/supabase-js';
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const hash = url.searchParams.get('token_hash');
  const type = url.searchParams.get('type');
  const next =
    url.searchParams.get('next') === '/reset-password' || type === 'recovery'
      ? '/reset-password'
      : '/app';
  const client = await db();
  let ok = false;
  if (code) {
    const { error } = await client.auth.exchangeCodeForSession(code);
    ok = !error;
  } else if (
    hash &&
    ['signup', 'recovery', 'email', 'email_change'].includes(type ?? '')
  ) {
    const { error } = await client.auth.verifyOtp({
      token_hash: hash,
      type: type as EmailOtpType,
    });
    ok = !error;
  }
  return NextResponse.redirect(
    new URL(
      ok
        ? next
        : '/sign-in?message=Email+link+expired+or+invalid.+Request+a+new+link.',
      process.env.APP_URL || url.origin,
    ),
  );
}
