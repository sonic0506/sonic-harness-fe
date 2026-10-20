// expect: no-restricted-imports
import { loadData } from '../api/data.server';

export function BadServerUi() {
  return <p>{loadData()}</p>;
}
