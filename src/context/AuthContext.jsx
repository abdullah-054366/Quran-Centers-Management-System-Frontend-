import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  api,
  normalizeTokens,
  refreshSession,
  setAuthFailureHandler,
  tokenStore,
} from "../api/axiosClient";

const AuthContext = createContext(null);

const CLAIM_PREFIX = "http://schemas.microsoft.com/ws/2008/06/identity/claims/";
const NAME_ID_CLAIM ="http://schemas.xmlsoap.org/ws/2005/12/identity/claims/nameidentifier";
const EMAIL_CLAIM ="http://schemas.xmlsoap.org/ws/2005/12/identity/claims/emailaddress";

// قراءة محتوى الـ JWT (للعرض فقط، التحقق الحقيقي يتم في الـ API)
function decodeJwt(token) {
  try {
    const payload = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(
      atob(payload)
        .split("")
        .map((c) => "%" + c.charCodeAt(0).toString(16).padStart(2, "0"))
        .join(""),
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
}

// الـ API لا يرجع كائن user، فنبنيه من الـ JWT
function buildUser(accessToken, fallbackEmail) {
  const claims = decodeJwt(accessToken);
  console.log("Claims :", claims); // تحقق من محتوى الـ JWT في وحدة التحكم
  if (!claims) return null;

  const role = claims[`${CLAIM_PREFIX}role`] ?? claims.role ?? null;

  return {
    id: claims[NAME_ID_CLAIM] ?? claims.Id ?? claims.sub ?? null,
    email: claims[EMAIL_CLAIM] ?? claims.email ?? fallbackEmail ?? null,
    role: Array.isArray(role) ? role[0] : role,
  };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  // نبدأ بحالة تحميل فقط إذا كانت هناك جلسة محفوظة نحاول استعادتها
  const [isLoading, setIsLoading] = useState(() =>
    Boolean(tokenStore.getRefreshToken() && tokenStore.getEmail()),
  );

  // استعادة الجلسة عند إعادة تحميل الصفحة
  useEffect(() => {
    let isMounted = true;

    // عند فشل الجلسة نهائياً (من الـ interceptor) نخرج المستخدم
    setAuthFailureHandler(() => setUser(null));

    if (!tokenStore.getRefreshToken() || !tokenStore.getEmail()) {
      return undefined;
    }

    refreshSession()
      .then((accessToken) => {
        if (isMounted) {
          setUser(buildUser(accessToken, tokenStore.getEmail()));
        }
      })
      .catch(() => {
        tokenStore.clear();
        if (isMounted) setUser(null);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // credentials = { email, password }
  const login = useCallback(async (credentials) => {
    const { data } = await api.post("/Auth/login", credentials);
    const tokens = normalizeTokens(data);

    tokenStore.set({ ...tokens, email: credentials.email });

    const currentUser = buildUser(tokens.accessToken, credentials.email);
    setUser(currentUser);
    return currentUser;
  }, []);

  // ملاحظة: مسار register غير موجود حالياً في AuthController.
  // أبقيته جاهزاً لحين إضافته في الـ API.
  const register = useCallback(async (formData) => {
    const { data } = await api.post("/Auth/register", formData);
    return data;
  }, []);

  const logout = useCallback(async () => {
    const email = tokenStore.getEmail();
    const refreshToken = tokenStore.getRefreshToken();

    try {
      if (email && refreshToken) {
        await api.post("/Auth/logout", { email, refreshToken });
      }
    } catch {
      /* نكمل الخروج محلياً حتى لو فشل الطلب */
    } finally {
      tokenStore.clear();
      setUser(null);
    }
  }, []);

  const value = useMemo(
    () => ({
      user,
      role: user?.role ?? null,
      isLoading,
      isAuthenticated: Boolean(user),
      login,
      register,
      logout,
    }),
    [user, isLoading, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("استخدم useAuth داخل AuthProvider.");
  }

  return context;
}
