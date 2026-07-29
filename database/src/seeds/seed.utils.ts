export function generateId(): string {
  return crypto.randomUUID();
}

export function generateTimestamp(): string {
  return new Date().toISOString();
}

export function pickRandom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

export function generateRandomNumber(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function generateRandomString(length: number = 8): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

export function generatePhoneNumber(): string {
  const prefixes = ['98', '99', '97', '96', '95', '94', '93', '92', '91', '90'];
  return `${pickRandom(prefixes)}${generateRandomNumber(10000000, 99999999)}`;
}
