export const API_BASE_URL = '/api';

export async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, init);
  if (!response.ok) throw new Error(`${response.status} ${path}`);
  return (await response.json()) as T;
}
