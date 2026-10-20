'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { ErrorBoundary } from 'react-error-boundary';

// 앱 전체 렌더 예외를 받는 마지막 경계예요. 데이터 블록의 에러는 page에서 따로 감싸요.
function AppErrorFallback() {
  return <p role="alert">화면을 그리지 못했어요. 새로고침해 주세요.</p>;
}

export function AppProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  return (
    <ErrorBoundary FallbackComponent={AppErrorFallback}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </ErrorBoundary>
  );
}
