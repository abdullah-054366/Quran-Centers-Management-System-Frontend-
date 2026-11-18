import { api } from "./axiosClient";

const centerParams = (centerId) => (centerId ? { params: { centerId } } : undefined);

export const getProfile = async () => (await api.get("/Account/me")).data;
export const updateProfile = async (payload) => (await api.put("/Account/me", payload)).data;
export const changePassword = async (payload) =>
  (await api.post("/Account/change-password", payload)).data;
export const logoutEverywhere = async () => (await api.post("/Account/logout-all")).data;

export const getCenterSettings = async (centerId) =>
  (await api.get("/Settings/center", centerParams(centerId))).data;
export const updateCenterSettings = async (payload, centerId) =>
  (await api.put("/Settings/center", payload, centerParams(centerId))).data;
export const setSelfRegistration = async (codeEnabled, centerId) =>
  (await api.put("/Settings/center/self-registration", { codeEnabled }, centerParams(centerId))).data;
export const regenerateMyCenterCode = async (centerId) =>
  (await api.post("/Settings/center/regenerate-code", null, centerParams(centerId))).data;

export const getSystemStatus = async () => (await api.get("/Settings/system")).data;
