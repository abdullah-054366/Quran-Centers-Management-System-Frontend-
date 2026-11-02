// src/api/axios.js
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL ?? "https://localhost:7171";

const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

export default api;