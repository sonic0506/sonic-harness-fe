'use client';

import { useEffect } from 'react';

import { env } from '@/shared/config';

// 개발 화면에서 브라우저 요청을 MSW로 받아요. 첫 화면은 서버가 그리니 기다리지 않아요.
export function MockStarter() {
  useEffect(() => {
    if (env.NEXT_PUBLIC_API_MOCKING !== 'true') return;
    void import('../mocks/browser').then(({ worker }) =>
      worker.start({ onUnhandledFrame: 'bypass' }),
    );
  }, []);
  return null;
}
