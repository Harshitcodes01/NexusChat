import api from './api';

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  name: string;
  email?: string;
  phoneNumber?: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: {
    id: string;
    name: string;
    email?: string;
    phoneNumber?: string;
    avatar: string;
    bio: string;
    status: string;
  };
  message?: string;
}

export const authService = {
  register: (data: RegisterPayload) =>
    api.post<AuthResponse>('/auth/register', data),

  login: (data: LoginPayload) =>
    api.post<AuthResponse>('/auth/login', data),

  verifyEmail: (token: string) =>
    api.post<AuthResponse>('/auth/verify-email', { token }),

  verifyOTP: (phoneNumber: string, otpCode: string) =>
    api.post<AuthResponse>('/auth/verify-otp', { phoneNumber, otpCode }),

  resendOTP: (phoneNumber: string) =>
    api.post<{ message: string }>('/auth/resend-otp', { phoneNumber }),

  forgotPassword: (email: string) =>
    api.post<{ message: string }>('/auth/forgot-password', { email }),

  resetPassword: (token: string, password: string) =>
    api.post<{ message: string }>('/auth/reset-password', { token, password }),

  getMe: () =>
    api.get<{ user: AuthResponse['user'] }>('/auth/me'),

  logout: () =>
    api.post('/auth/logout'),
};
