import { fetchJson } from './http';

type HealthResponse = {
    status: string;
    postgres: string;
    vectorDB: string;
    timestamp: string;
};

export async function fetchHealthStatus() {
    return fetchJson<HealthResponse>('/api/health');
}
