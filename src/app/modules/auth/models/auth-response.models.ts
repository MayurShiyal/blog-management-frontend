export interface AuthUserDto {
  id: string;
  firstName: string;
  lastName?: string;
  email: string;
  role: string;
  status: string;
  isVerified: boolean;
  createdAt: string;
}

export interface RegisterResponse {
  status: boolean;
  message: string;
  data?: AuthUserDto;
}

export interface LoginResponse {
  status: boolean;
  message: string;
  token?: string;
  data?: AuthUserDto;
}

export interface ForgotPasswordResponse {
  status: boolean;
  message: string;
}

export interface ResetPasswordResponse {
  status: boolean;
  message: string;
}
