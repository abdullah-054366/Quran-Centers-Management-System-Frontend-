import { api } from "./axiosClient";

const GROUPS_ENDPOINT = "/Halaqat";

export const getGroups = async () => {
  try {
    const response = await api.get(`${GROUPS_ENDPOINT}/All`);
    return response.data;
  } catch (error) {
    console.error("Error fetching groups:", error);
    throw error;
  }
};

export const addGroup = async (groupData) => {
  try {
    const response = await api.post(GROUPS_ENDPOINT, groupData);
    return response.data;
  } catch (error) {
    console.error("Error adding group:", error);
    throw error;
  }
};

export const updateGroup = async (groupId, groupData) => {
  try {
    const response = await api.put(`${GROUPS_ENDPOINT}/${groupId}`, groupData);
    return response.data;
  } catch (error) {
    console.error("Error updating group:", error);
    throw error;
  }
};

export const deleteGroup = async (groupId) => {
  try {
    const response = await api.delete(`${GROUPS_ENDPOINT}/${groupId}`);
    return response.data;
  } catch (error) {
    console.error("Error deleting group:", error);
    throw error;
  }
};
