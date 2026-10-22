export function weekStart(offset = 0, now = new Date()) {
  const local = new Date(now.getTime() + 330 * 60000);
  const days = (local.getUTCDay() + 6) % 7;
  return new Date(
    Date.UTC(
      local.getUTCFullYear(),
      local.getUTCMonth(),
      local.getUTCDate() - days + offset * 7,
    ) -
      330 * 60000,
  );
}
