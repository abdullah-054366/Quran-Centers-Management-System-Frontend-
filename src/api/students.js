import api from "./api";

const STUDENTS_ENDPOINT = "/Students";

export const getStudents = async () => {
  try {
    const response = await api.get(`${STUDENTS_ENDPOINT}/All`);
    return response.data;
  } catch (error) {
    console.error("Error fetching students:", error);
    throw error;
  }
};

export const getStudentById = async (studentId) => {
  try {
    const response = await api.get(`${STUDENTS_ENDPOINT}/${studentId}`);
    return response.data;
  } catch (error) {
    console.error("Error fetching student:", error);
    throw error;
  }
};
