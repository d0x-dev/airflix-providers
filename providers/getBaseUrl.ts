const urlsEndpoints = [
  "https://raw.githubusercontent.com/d0x-dev/airflix-providers/refs/heads/main/urls.json",
  "https://cdn.jsdelivr.net/gh/d0x-dev/airflix-providers@main/urls.json",
];
const cacheTtl = 60 * 60 * 1000;

type ProviderUrls = Record<string, { url: string }>;

type BaseUrlCache = {
  data?: ProviderUrls;
  expiresAt: number;
  request?: Promise<ProviderUrls>;
};

type ProviderState = {
  __airflixProviderBaseUrlCache__?: BaseUrlCache;
};

declare const providerGlobal: ProviderState | undefined;

function getCache(): BaseUrlCache {
  const state =
    typeof providerGlobal !== "undefined" && providerGlobal
      ? providerGlobal
      : (globalThis as typeof globalThis & ProviderState);

  state.__airflixProviderBaseUrlCache__ ??= { expiresAt: 0 };
  return state.__airflixProviderBaseUrlCache__;
}

async function fetchFromEndpoints(): Promise<ProviderUrls> {
  let lastError: unknown;
  for (const endpoint of urlsEndpoints) {
    try {
      const response = await fetch(endpoint);
      if (response.ok) {
        return (await response.json()) as ProviderUrls;
      }
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError || new Error("Failed to fetch provider URL configuration");
}

async function fetchProviderUrls(): Promise<ProviderUrls> {
  const cache = getCache();

  if (cache.data && Date.now() < cache.expiresAt) {
    return cache.data;
  }

  if (cache.request) {
    return cache.request;
  }

  const request = fetchFromEndpoints()
    .then((data) => {
      console.log("Fetched provider URL configuration");
      cache.data = data;
      cache.expiresAt = Date.now() + cacheTtl;
      return data;
    })
    .catch((error) => {
      if (cache.data) {
        console.warn("Using stale provider URL configuration", error);
        return cache.data;
      }

      throw error;
    })
    .finally(() => {
      cache.request = undefined;
    });

  Object.defineProperty(cache, "request", {
    configurable: true,
    enumerable: false,
    value: request,
    writable: true,
  });
  return request;
}

export const getBaseUrl = async (providerValue: string) => {
  try {
    const providerUrls = await fetchProviderUrls();
    return providerUrls[providerValue]?.url ?? "";
  } catch (error) {
    console.error(`Error fetching baseUrl: ${providerValue}`, error);
    throw error;
  }
};
