import { apiRequest } from './client';

export const authApi = {
  register: (name, email, password) =>
    apiRequest('/auth/register', {
      method: 'POST',
      body: { name, email, password },
    }),

  login: (email, password) =>
    apiRequest('/auth/login', {
      method: 'POST',
      body: { email, password },
    }),

  getMe: () =>
    apiRequest('/auth/me', {
      method: 'GET',
    }),
};

