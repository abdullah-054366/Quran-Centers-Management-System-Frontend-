import { api } from "./axiosClient";

export const getAuditLogs = async ({ action, entityType, search, from, to, page = 1, pageSize = 25 } = {}) => {
  const params = { page, pageSize };
  if (action) params.action = action;
  if (entityType) params.entityType = entityType;
  if (search) params.search = search;
  if (from) params.from = from;
  if (to) params.to = to;
  return (await api.get("/Audit", { params })).data;
};
