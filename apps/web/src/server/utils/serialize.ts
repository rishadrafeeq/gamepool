export function toIso(value: Date | null | undefined): string | null {
  return value ? value.toISOString() : null;
}

export function parseTimeToDate(time: string): Date {
  const normalized = time.length === 5 ? `${time}:00` : time;
  return new Date(`1970-01-01T${normalized}.000Z`);
}

export function paginate(page: number, limit: number) {
  return { skip: (page - 1) * limit, take: limit };
}
