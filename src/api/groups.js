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

export const getGroupById = async (groupId) => (await api.get(`${GROUPS_ENDPOINT}/${groupId}`)).data;

export const getGroupStudents = async (groupId) =>
  (await api.get(`${GROUPS_ENDPOINT}/${groupId}/Students`)).data;

// طلاب المركز غير المسجلين في أي حلقة.
export const getAvailableStudents = async (groupId) =>
  (await api.get(`${GROUPS_ENDPOINT}/${groupId}/AvailableStudents`)).data;

export const assignStudents = async (groupId, studentIds) =>
  (await api.post(`${GROUPS_ENDPOINT}/${groupId}/Students`, { studentIds })).data;

export const removeStudentFromGroup = async (groupId, studentId) => {
  await api.delete(`${GROUPS_ENDPOINT}/${groupId}/Students/${studentId}`);
};
