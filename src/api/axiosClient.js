import axios from "axios";

// عنوان الـ API الأساسي (بدون /api وبدون مسار الدخول)
// في Vite: أنشئ ملف .env.local وضع فيه: VITE_API_URL=https://localhost:7171
const API_URL = import.meta.env.VITE_API_URL ?? "https://localhost:7171";

const REFRESH_KEY = "halaqa_refresh_token";
const EMAIL_KEY = "halaqa_email";

// الـ Access Token يبقى في الذاكرة فقط (أأمن من التخزين في المتصفح)
let accessToken = null;
let onAuthFailure = null;

function safeGet(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* التخزين غير متاح */
  }
}

function safeRemove(key) {
  try {
    localStorage.removeItem(key);
  } catch {
    /* التخزين غير متاح */
  }
}

export const tokenStore = {
  getAccessToken: () => accessToken,
  getRefreshToken: () => safeGet(REFRESH_KEY),
  getEmail: () => safeGet(EMAIL_KEY),

  set({ accessToken: newAccess, refreshToken, email }) {
    accessToken = newAccess ?? null;
    if (refreshToken) safeSet(REFRESH_KEY, refreshToken);
    if (email) safeSet(EMAIL_KEY, email);
  },

  clear() {
    accessToken = null;
    safeRemove(REFRESH_KEY);
    safeRemove(EMAIL_KEY);
  },
};

// يُستدعى عندما تفشل الجلسة نهائياً (مثلاً انتهى الـ Refresh Token)
export function setAuthFailureHandler(handler) {
  onAuthFailure = handler;
}

// يدعم camelCase (الافتراضي في ASP.NET Core) و PascalCase
export function normalizeTokens(data) {
  return {
    accessToken: data?.accessToken ?? data?.AccessToken ?? null,
    refreshToken: data?.refreshToken ?? data?.RefreshToken ?? null,
  };
}

// تحويل رسالة الخطأ القادمة من الـ API إلى رسالة مفهومة للمستخدم
export function getErrorMessage(error) {
  const status = error?.response?.status;
  const data = error?.response?.data;

  if (status === 429) return "محاولات كثيرة، حاول مرة أخرى بعد قليل.";
  if (!error?.response) return "تعذر الاتصال بالخادم.";
  if (typeof data === "string" && data) {
    if (data === "Invalid credentials") {
      return "البريد الإلكتروني أو كلمة المرور غير صحيحة.";
    }
    return data;
  }
  return data?.message || data?.title || "تعذر إكمال الطلب.";
}

export const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: { "Content-Type": "application/json" },
  timeout: 15000,
});

// إرفاق الـ Access Token تلقائياً بكل طلب
api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

// تجديد الجلسة: طلب واحد فقط في نفس الوقت.
// مهم لأن الـ API يغيّر الـ Refresh Token مع كل تجديد (Rotation)،
// فلو أُرسل طلبان معاً سينجح الأول ويفشل الثاني.
let refreshPromise = null;

export function refreshSession() {
  if (refreshPromise) return refreshPromise;

  const email = tokenStore.getEmail();
  const refreshToken = tokenStore.getRefreshToken();

  if (!email || !refreshToken) {
    return Promise.reject(new Error("no-session"));
  }

  // نستخدم axios مباشرة (وليس api) لتجنب حلقة لا نهائية في الـ interceptor
  refreshPromise = axios
    .post(`${API_URL}/api/Auth/refresh`, { email, refreshToken })
    .then(({ data }) => {
      const tokens = normalizeTokens(data);
      tokenStore.set({ ...tokens, email });
      return tokens.accessToken;
    })
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
}

// عند 401: جدّد التوكن ثم أعد الطلب الأصلي مرة واحدة
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    const status = error.response?.status;
    const isAuthCall = /\/auth\//i.test(original?.url ?? "");

    if (status === 401 && original && !original._retry && !isAuthCall) {
      original._retry = true;
      try {
        const newToken = await refreshSession();
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      } catch {
        tokenStore.clear();
        onAuthFailure?.();
      }
    }

    return Promise.reject(error);
  },
);
