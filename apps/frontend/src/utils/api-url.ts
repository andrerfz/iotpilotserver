export const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? '';

export const apiUrl = (path: string): string => `${API_BASE}${path}`;
