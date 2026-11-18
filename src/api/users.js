import { api } from "./axiosClient";

const USERS_ENDPOINT = "/Users";

export const getUsers = async () => {
  try {
    const response = await api.get(`${USERS_ENDPOINT}`);
    return response.data;
  } catch (error) {
    console.error("Error fetching users:", error);
    throw error;
  }
};

export const getRoles = async () => (await api.get(`${USERS_ENDPOINT}/Roles`)).data;

export const createUser = async (payload) =>
  (await api.post(USERS_ENDPOINT, payload)).data;

export const updateUser = async (userId, payload) =>
  (await api.put(`${USERS_ENDPOINT}/${userId}`, payload)).data;

export const setUserActive = async (userId, isActive) =>
  (await api.put(`${USERS_ENDPOINT}/${userId}/status`, { isActive })).data;

export const resetUserPassword = async (userId, newPassword) =>
  (await api.put(`${USERS_ENDPOINT}/${userId}/password`, { newPassword })).data;

export const deleteUser = async (userId) => {
  await api.delete(`${USERS_ENDPOINT}/${userId}`);
};

export const getUsersCount = async () => {
  try {
    const response = await api.get(`${USERS_ENDPOINT}/Count`);
    return response.data;
  } catch (error) {
    console.error("Error fetching users count:", error);
    throw error;
  }
};
