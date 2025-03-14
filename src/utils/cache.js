// utils/cache.js
const CACHE_KEY = "supabaseData";
const TIMESTAMP_KEY = "supabaseTimestamp";
const CACHE_DURATION = 30 * 60 * 1000; // 30 นาที

export const getCachedData = () => {
  const cachedData = sessionStorage.getItem(CACHE_KEY);
  const cachedTimestamp = sessionStorage.getItem(TIMESTAMP_KEY);
  const now = Date.now();
  if (cachedData && cachedTimestamp && now - parseInt(cachedTimestamp) < CACHE_DURATION) {
    return JSON.parse(cachedData);
  }
  return null;
};

export const setCachedData = (data) => {
  sessionStorage.setItem(CACHE_KEY, JSON.stringify(data));
  sessionStorage.setItem(TIMESTAMP_KEY, Date.now().toString());
};