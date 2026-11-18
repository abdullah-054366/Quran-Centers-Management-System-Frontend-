import { api } from "./axiosClient";

const ATTENDANCE_ENDPOINT = "/Attendance";

// params اختيارية: { halaqaId, from: "YYYY-MM-DD", to: "YYYY-MM-DD" }
export const getAttendance = async (params = {}) => {
  try {
    const response = await api.get(`${ATTENDANCE_ENDPOINT}/All`, { params });
    return response.data;
  } catch (error) {
    console.error("Error fetching attendance:", error);
    throw error;
  }
};

export const getAttendanceHalaqas = async () => {
  try {
    const response = await api.get(`${ATTENDANCE_ENDPOINT}/Halaqas`);
    return response.data;
  } catch (error) {
    console.error("Error fetching attendance halaqas:", error);
    throw error;
  }
};

export const getStudentsByHalaqa = async (halaqaId) => {
  try {
    const response = await api.get(`${ATTENDANCE_ENDPOINT}/Halaqas/${halaqaId}/Students`);
    return response.data;
  } catch (error) {
    console.error("Error fetching halaqa students:", error);
    throw error;
  }
};

export const saveAttendance = async (attendanceRecords) => {
  try {
    const response = await api.post(`${ATTENDANCE_ENDPOINT}/Bulk`, attendanceRecords);
    return response.data;
  } catch (error) {
    console.error("Error saving attendance:", error);
    throw error;
  }
};
