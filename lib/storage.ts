export const DEFAULT_STORAGE_KEY = "dobae_v1_save";

export const getUserStorageKey = (userId?: string | null) => {
  if (!userId) return DEFAULT_STORAGE_KEY;
  return `${DEFAULT_STORAGE_KEY}_${userId}`;
};