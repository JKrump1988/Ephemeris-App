import axios from "axios";


const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const TOKEN_KEY = "ephemeral-auth-token";


export const api = axios.create({
  baseURL: `${BACKEND_URL}/api`,
});


export const setAuthToken = (token) => {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
    return;
  }
  delete api.defaults.headers.common.Authorization;
};


export const saveToken = (token) => {
  localStorage.setItem(TOKEN_KEY, token);
  setAuthToken(token);
};


export const readToken = () => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    setAuthToken(token);
  }
  return token;
};


export const clearToken = () => {
  localStorage.removeItem(TOKEN_KEY);
  setAuthToken(null);
};