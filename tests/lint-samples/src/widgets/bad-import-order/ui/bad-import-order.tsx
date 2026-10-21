// expect: simple-import-sort/imports
import { http } from '@/shared/api';
import { useState } from 'react';

export function BadImportOrder() {
  const [path] = useState('/users');
  return <button onClick={() => void http(path)}>불러오기</button>;
}
