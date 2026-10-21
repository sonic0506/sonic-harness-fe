'use client';

import { useState } from 'react';

export function UserSearch({ onSearch }: { onSearch: (q: string) => void }) {
  const [q, setQ] = useState('');
  return (
    <input
      aria-label="사용자 검색"
      value={q}
      onChange={(event) => {
        setQ(event.target.value);
        onSearch(event.target.value);
      }}
    />
  );
}
