import { api } from "./axiosClient";

const TEACHERS_ENDPOINT = "/Teachers";

export const getTeachers = async () => {
  try {
    const response = await api.get(`${TEACHERS_ENDPOINT}/All`);
    return response.data;
  } catch (error) {
    console.error("Error fetching teachers:", error);
    throw error;
  }
};

export const addTeacher = async (teacherData) => {
  try {
    const response = await api.post(TEACHERS_ENDPOINT, teacherData);
    return response.data;
  } catch (error) {
    console.error("Error adding teacher:", error);
    throw error;
  }
};

export const updateTeacher = async (teacherId, teacherData) => {
  try {
    const response = await api.put(`${TEACHERS_ENDPOINT}/${teacherId}`, teacherData);
    return response.data;
  } catch (error) {
    console.error("Error updating teacher:", error);
    throw error;
  }
};

export const deleteTeacher = async (teacherId) => {
  try {
    const response = await api.delete(`${TEACHERS_ENDPOINT}/${teacherId}`);
    return response.data;
  } catch (error) {
    console.error("Error deleting teacher:", error);
    throw error;
  }
};
