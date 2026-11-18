import { api } from "./axiosClient";

const HALAQA_ENDPOINT = "/Halaqa";

export const getHalaqas = async () => {
  try {
    const response = await api.get(`${HALAQA_ENDPOINT}/All`);
    return response.data;
  } catch (error) {
    console.error("Error fetching halaqas:", error);
    throw error;
  }
};

export const getHalaqaById = async (halaqaId) => {
  try {
    const response = await api.get(`${HALAQA_ENDPOINT}/${halaqaId}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching halaqa with ID ${halaqaId}:`, error);
    throw error;
  }
};
