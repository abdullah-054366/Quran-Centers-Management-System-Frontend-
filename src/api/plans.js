import { api } from "./axiosClient";

const PLANS_ENDPOINT = "/MemorizationPlan";

export const getMemorizationPlans = async () => {
  try {
    const response = await api.get(`${PLANS_ENDPOINT}/All`);
    return response.data;
  } catch (error) {
    console.error("Error fetching memorization plans:", error);
    throw error;
  }
};

export const addMemorizationPlan = async (plan) => {
  try {
    const response = await api.post(PLANS_ENDPOINT, plan);
    return response.data;
  } catch (error) {
    console.error("Error creating memorization plan:", error);
    throw error;
  }
};

export const updateMemorizationPlanStatus = async (planId, isActive) => {
  try {
    const response = await api.put(`${PLANS_ENDPOINT}/${planId}/status`, { isActive });
    return response.data;
  } catch (error) {
    console.error("Error updating memorization plan:", error);
    throw error;
  }
};

export const getMemorizationPlan = async (planId) => {
  try {
    const response = await api.get(`${PLANS_ENDPOINT}/${planId}`);
    return response.data;
  } catch (error) {
    console.error("Error fetching memorization plan:", error);
    throw error;
  }
};
