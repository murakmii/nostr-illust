const cacheKey = 'nostr-illust-cache';
const currentVersion = 5;
let maxUsage = 1024 * 1024 * 3;
let dirty = false;

let cache = window.localStorage.getItem(cacheKey) || '{}';
if (cache) {
  console.info('thumbnail cache usage: ' + cache.length);
  try {
    cache = JSON.parse(cache);
  } catch(e) {
    console.warn('failed to parse cache metadata: ' + e);
    cache = {};
  }
}

if (cache.version !== currentVersion) {
  cache = {
    version: currentVersion,
    entries: [],
  }
}

setInterval(() => {
  if (!dirty) {
    return;
  }

  try {
    window.localStorage.setItem(cacheKey, JSON.stringify(cache));
    console.info('persisted thumbnail cache');
  } catch (error) {
    console.warn('failed to persist cache. exceeded limit or private mode?');
    if (maxUsage > 1024 * 100) {
      maxUsage -= 1024 * 100;
    }
  }

  dirty = false;
}, 5000);

export function doCache(event, blob) {
  const reader = new FileReader();
  reader.onload = (e) => {
    if (fromCache(event) || e.target.result.length > maxUsage) {
      return;
    }

    let usage = cache.entries.reduce((sum, e) => sum + e.data.length, 0);
    while (usage + e.target.result.length > maxUsage && cache.entries.length > 0) {
      usage -= cache.entries.shift().data.length;
    }

    cache.entries.push({ id: event.id, createdAt: event.createdAt, data: e.target.result });
    cache.entries.sort((a, b) => a.createdAt - b.createdAt);
    dirty = true;
  };
  reader.readAsDataURL(blob);
}

export function fromCache(event) {
  const entry = cache.entries.find(e => e.id === event.id);
  if (entry && entry.data && entry.data.startsWith('data:image/')) {
    return entry.data;
  }

  return null;
}
