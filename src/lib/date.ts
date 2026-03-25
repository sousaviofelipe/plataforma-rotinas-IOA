export const MOCK_DATE = false;

export function getNow(): Date {
  if (MOCK_DATE) {
    return new Date("2026-03-26T10:00:00");
  }
  return new Date();
}
