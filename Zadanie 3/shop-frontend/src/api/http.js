import axios from "axios";

const baseURL = import.meta.env.VITE_API_URL || "http://localhost:3000";

export const http = axios.create({
    baseURL,
});

let isRefreshing = false;
let pendingQueue = [];

function processQueue(error, token = null) {
    pendingQueue.forEach((p) => {
        if (error) p.reject(error);
        else p.resolve(token);
    });
    pendingQueue = [];
}

export function setupInterceptors(getAuthState, setAuthState, logout) {
    http.interceptors.request.use((config) => {
        const { accessToken } = getAuthState();
        if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
        return config;
    });

    http.interceptors.response.use(
        (res) => res,
        async (err) => {
            const original = err.config;

            // jeżeli 401 i nie próbujemy jeszcze refresh
            if (err?.response?.status === 401 && !original._retry) {
                original._retry = true;

                const { refreshToken } = getAuthState();
                if (!refreshToken) {
                    logout();
                    return Promise.reject(err);
                }

                if (isRefreshing) {
                    return new Promise((resolve, reject) => {
                        pendingQueue.push({
                            resolve: (token) => {
                                original.headers.Authorization = `Bearer ${token}`;
                                resolve(http(original));
                            },
                            reject,
                        });
                    });
                }

                isRefreshing = true;
                try {
                    // backend: POST /refresh { refreshToken }
                    const r = await axios.post(`${baseURL}/refresh`, { refreshToken });
                    const newAccess = r.data?.accessToken;

                    if (!newAccess) throw new Error("No accessToken in refresh response");

                    setAuthState((s) => ({ ...s, accessToken: newAccess }));
                    processQueue(null, newAccess);

                    original.headers.Authorization = `Bearer ${newAccess}`;
                    return http(original);
                } catch (e) {
                    processQueue(e, null);
                    logout();
                    return Promise.reject(e);
                } finally {
                    isRefreshing = false;
                }
            }

            return Promise.reject(err);
        }
    );
}
