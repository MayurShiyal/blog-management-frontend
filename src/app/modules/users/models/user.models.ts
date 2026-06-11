import { UserStatus } from '../../../common/enums';

export { UserStatus } from '../../../common/enums';
export type UserRole = 'Author' | 'Visitor';

export interface UserListItemDto {
  id: string;
  firstName: string;
  lastName?: string | null;
  fullName: string;
  email: string;
  role: string;
  status: string;
  isVerified: boolean;
  createdAt: string;
  updatedAt?: string | null;
}

export interface GetUsersResponse {
  status: boolean;
  message: string;
  items: UserListItemDto[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
}

export interface UserDetailDto {
  id: string;
  firstName: string;
  lastName?: string | null;
  fullName: string;
  email: string;
  role: string;
  status: string;
  isVerified: boolean;
  createdAt: string;
  updatedAt?: string | null;
}

export interface GetUserByIdResponse {
  status: boolean;
  message: string;
  data?: UserDetailDto | null;
}

export interface UpdateUserRequest {
  firstName: string;
  lastName?: string | null;
}

export interface UpdateUserResponse {
  status: boolean;
  message: string;
  data?: UserDetailDto | null;
}

export interface UpdateUserStatusRequest {
  status: UserStatus;
}

export interface UpdateUserStatusResponse {
  status: boolean;
  message: string;
  data?: {
    id: string;
    fullName: string;
    email: string;
    status: string;
    updatedAt?: string | null;
  } | null;
}

export interface DeleteUserResponse {
  status: boolean;
  message: string;
}
