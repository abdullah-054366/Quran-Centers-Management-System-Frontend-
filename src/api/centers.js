import { api } from "./axiosClient";

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


export const getCenterById = async (centerId) => {
  try {
    const response = await api.get(`${CENTERS_ENDPOINT}/${centerId}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching center with ID ${centerId}:`, error);
    throw error;
  }
}


export const getCenterCount = async () => {
  try {
    const response = await api.get(`${CENTERS_ENDPOINT}/Count`);
    return response.data;
  }
  catch (error) {
    console.error("Error fetching center count:", error);
    throw error;
  }

};


export const getActiveCentersCount = async () => {
  try {
    const response = await api.get(`${CENTERS_ENDPOINT}/ActiveCount`);
    return response.data;
  }
  catch (error) {
    console.error("Error fetching active centers count:", error);
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

export const renameCenter = async (centerId, centerName) =>
  (await api.put(`${CENTERS_ENDPOINT}/${centerId}`, { centerName })).data;

export const regenerateCenterCode = async (centerId) =>
  (await api.post(`${CENTERS_ENDPOINT}/${centerId}/regenerate-code`)).data;

export const getCenterDeletionSummary = async (centerId) =>
  (await api.get(`${CENTERS_ENDPOINT}/${centerId}/deletion-summary`)).data;

export const deleteCenter = async (centerId) => {
  await api.delete(`${CENTERS_ENDPOINT}/${centerId}`);
};

// محو المركز وكل بياناته. لا رجعة فيه؛ الخادم يطلب اسم المركز وأن يكون موقوفاً.
export const purgeCenter = async (centerId, centerName) =>
  (await api.delete(`${CENTERS_ENDPOINT}/${centerId}/purge`, { params: { confirm: centerName } })).data;

export const getCenterOverview = async (centerId) =>
  (await api.get(`${CENTERS_ENDPOINT}/${centerId}/overview`)).data;

export const getPlatformOverview = async () =>
  (await api.get(`${CENTERS_ENDPOINT}/Overview`)).data;
