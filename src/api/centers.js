import api from "./api";

const CENTERS_ENDPOINT = "/Centers";

export const getCenters = async () => {
  try {
    const response = await api.get(`${CENTERS_ENDPOINT}/All`);
    return response.data;
  } catch (error) {
    console.error("Error fetching centers:", error);
    throw error;
  }
};

export const addCenter = async (centerData) => {
  try {
    const response = await api.post(CENTERS_ENDPOINT, centerData);
    return response.data;
  } catch (error) {
    console.error("Error adding center:", error);
    throw error;
  }
};

export const updateCenter = async (centerId, field, value) => {
  try {
    const endpoint = field === "isActive" ? "status" : "code";
    const response = await api.put(
      `${CENTERS_ENDPOINT}/${centerId}/${endpoint}`,
      { [field]: value }
    );
    return response.data;
  } catch (error) {
    console.error("Error updating center:", error);
    throw error;
  }
};
