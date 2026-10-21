// expect: @typescript-eslint/switch-exhaustiveness-check
type Status = 'active' | 'revoked' | 'expired';

export function label(status: Status): string {
  switch (status) {
    case 'active':
      return '활성';
    case 'revoked':
      return '폐기';
  }
  return '';
}
