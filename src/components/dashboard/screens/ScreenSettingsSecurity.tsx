'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardHeader, Btn, Field, Input } from '../ui';

type PwdState = 'idle' | 'saving' | 'saved' | 'error';

export default function ScreenSettingsSecurity({ userEmail }: { userEmail: string }) {
  const [pwdCurrent, setPwdCurrent] = useState('');
  const [pwdNew,     setPwdNew]     = useState('');
  const [pwdState,   setPwdState]   = useState<PwdState>('idle');
  const [pwdError,   setPwdError]   = useState('');

  async function handlePasswordChange() {
    setPwdError('');
    if (!pwdCurrent) { setPwdError('Enter your current password.'); return; }
    if (pwdNew.length < 8) { setPwdError('New password must be at least 8 characters.'); return; }
    setPwdState('saving');
    const supabase = createClient();
    const { error: signInErr } = await supabase.auth.signInWithPassword({
      email: userEmail,
      password: pwdCurrent,
    });
    if (signInErr) {
      setPwdError('Current password is incorrect.');
      setPwdState('error');
      return;
    }
    const { error: updateErr } = await supabase.auth.updateUser({ password: pwdNew });
    if (updateErr) {
      setPwdError(updateErr.message);
      setPwdState('error');
      return;
    }
    setPwdState('saved');
    setPwdCurrent('');
    setPwdNew('');
    setTimeout(() => setPwdState('idle'), 3000);
  }

  return (
    <>
      <Card>
        <CardHeader title="Password" subtitle="Leave blank if you signed up with Google" />
        <div className="lp-grid lp-grid-2" style={{ gap: 14 }}>
          <Field label="Current password">
            <Input
              type="password"
              placeholder="Enter current password"
              icon="lock"
              value={pwdCurrent}
              onChange={e => { setPwdCurrent(e.target.value); setPwdError(''); setPwdState('idle'); }}
            />
          </Field>
          <Field label="New password" hint="At least 8 characters">
            <Input
              type="password"
              placeholder="At least 8 characters"
              icon="lock"
              value={pwdNew}
              onChange={e => { setPwdNew(e.target.value); setPwdError(''); setPwdState('idle'); }}
            />
          </Field>
        </div>
        {pwdError && (
          <div style={{ fontSize: 12, color: 'var(--lp-danger, #ef4444)', marginTop: 6 }}>{pwdError}</div>
        )}
        <Btn
          variant="primary"
          icon={pwdState === 'saved' ? 'check' : 'lock'}
          onClick={handlePasswordChange}
          disabled={pwdState === 'saving'}
        >
          {pwdState === 'saving' ? 'Updating…' : pwdState === 'saved' ? 'Password updated!' : 'Update password'}
        </Btn>
      </Card>
      <Card>
        <CardHeader title="Two-factor authentication" subtitle="Coming in a future update" />
        <div style={{ fontSize: 13, color: 'var(--lp-fg-muted)', padding: '8px 0' }}>
          Authenticator app and SMS verification will be available soon.
        </div>
      </Card>
    </>
  );
}
