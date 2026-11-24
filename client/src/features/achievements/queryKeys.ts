// Cache keys of the achievement data. In their own file so that the quest hooks can
// refresh them after a completion without importing the achievement hooks (no cycle).
export const achievementsKey = ['achievements'] as const;
export const titlesKey = ['titles'] as const;
export const notificationsKey = ['notifications'] as const;
