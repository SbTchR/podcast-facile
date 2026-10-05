interface SoundPreferences { favorites: string[]; recent: string[] }
const KEY = 'podcast-facile-sounds-v1';
export function readSoundPreferences(): SoundPreferences {
  try {
    const value = JSON.parse(localStorage.getItem(KEY) ?? '{}');
    const ids = (list: unknown) => Array.isArray(list) ? list.filter((id): id is string => typeof id === 'string').slice(0, 100) : [];
    return { favorites: ids(value.favorites), recent: ids(value.recent) };
  } catch { return { favorites: [], recent: [] }; }
}
function store(value: SoundPreferences): SoundPreferences {
  try { localStorage.setItem(KEY, JSON.stringify(value)); } catch { /* Selection works even when storage is unavailable. */ }
  return value;
}
export function toggleFavoriteSound(id: string): SoundPreferences {
  const current = readSoundPreferences();
  return store({ ...current, favorites: current.favorites.includes(id) ? current.favorites.filter(item => item !== id) : [...current.favorites, id].slice(-100) });
}
export function rememberSound(id: string): void {
  const current = readSoundPreferences();
  store({ ...current, recent: [id, ...current.recent.filter(item => item !== id)].slice(0, 20) });
}
