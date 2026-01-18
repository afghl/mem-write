type SupabaseRestConfig = {
    restUrl: string;
    apiKey: string;
};

const getSupabaseRestConfig = (): SupabaseRestConfig | null => {
    const url = process.env.SUPABASE_URL?.trim();
    const apiKey =
        process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ??
        process.env.SUPABASE_ANON_KEY?.trim();

    if (!url || !apiKey) return null;

    const restUrl = `${url.replace(/\/$/, '')}/rest/v1`;
    return { restUrl, apiKey };
};

const buildHeaders = (apiKey: string, extra?: Record<string, string>) => ({
    apikey: apiKey,
    Authorization: `Bearer ${apiKey}`,
    Accept: 'application/json',
    ...extra,
});

const supabaseRequest = async <T>(
    config: SupabaseRestConfig,
    path: string,
    options?: { method?: string; body?: unknown; headers?: Record<string, string> },
): Promise<T> => {
    const response = await fetch(`${config.restUrl}${path}`, {
        method: options?.method ?? 'GET',
        headers: buildHeaders(
            config.apiKey,
            options?.body ? { 'Content-Type': 'application/json', ...options?.headers } : options?.headers,
        ),
        body: options?.body ? JSON.stringify(options.body) : undefined,
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(
            `Supabase request failed: ${response.status} ${response.statusText} - ${text}`,
        );
    }

    if (response.status === 204) {
        return undefined as T;
    }

    const text = await response.text();
    if (!text) {
        return undefined as T;
    }

    return JSON.parse(text) as T;
};
export type { SupabaseRestConfig };
export { getSupabaseRestConfig, supabaseRequest };