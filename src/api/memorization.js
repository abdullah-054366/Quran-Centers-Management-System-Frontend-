import { api } from "./axiosClient";

const MEMORIZATION_ENDPOINT = "/Memorization";

// params اختيارية: { studentId, from: "YYYY-MM-DD", to: "YYYY-MM-DD" }
export const getMemorizationRecords = async (params = {}) => {
  try {
    const response = await api.get(`${MEMORIZATION_ENDPOINT}/All`, { params });
    return response.data;
  } catch (error) {
    console.error("Error fetching memorization records:", error);
    throw error;
  }
};

export const getMemorizationStudents = async () => {
  try {
    const response = await api.get(`${MEMORIZATION_ENDPOINT}/Students`);
    return response.data;
  } catch (error) {
    console.error("Error fetching memorization students:", error);
    throw error;
  }
};

export const saveMemorizationRecords = async (records) => {
  try {
    const response = await api.post(`${MEMORIZATION_ENDPOINT}/Bulk`, records);
    return response.data;
  } catch (error) {
    console.error("Error saving memorization records:", error);
    throw error;
  }
};

// عدد سجلات الحفظ والمراجعة المسجلة للطالب في يوم معيّن (اليوم بتوقيت الرياض افتراضياً).
export const getMemorizationDailyUsage = async (studentId, date) => {
  try {
    const response = await api.get(`${MEMORIZATION_ENDPOINT}/DailyUsage`, {
      params: { studentId, ...(date ? { date } : {}) },
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching memorization daily usage:", error);
    throw error;
  }
};
