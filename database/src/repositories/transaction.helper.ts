export async function withTransaction<T>(
  _db: unknown,
  fn: () => Promise<T>,
): Promise<T> {
  return fn();
}

export async function withPgTransaction<T>(
  _db: unknown,
  fn: () => Promise<T>,
): Promise<T> {
  return fn();
}

export async function withSqliteTransaction<T>(
  _db: unknown,
  fn: () => Promise<T>,
): Promise<T> {
  return fn();
}
