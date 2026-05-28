// ── Enums (match backend UserRole / UserStatus enums) ──────────────────────
export type UserRole   = 'Author' | 'Visitor';
export enum UserStatus {
  Inactive = 0,
  Active = 1
}

// ── List item DTO  (GET /api/admin/users) ───────────────────────────────────
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

// ── GET /api/admin/users  response ─────────────────────────────────────────
export interface GetUsersResponse {
  status: boolean;
  message: string;
  items: UserListItemDto[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
}

// ── Detail DTO  (GET /api/admin/users/{id}) ─────────────────────────────────
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

// ── GET /api/admin/users/{id}  response ────────────────────────────────────
export interface GetUserByIdResponse {
  status: boolean;
  message: string;
  data?: UserDetailDto | null;
}

// ── PUT /api/admin/users/{id}  request ─────────────────────────────────────
export interface UpdateUserRequest {
  firstName: string;
  lastName?: string | null;
}

// ── PUT /api/admin/users/{id}  response ────────────────────────────────────
export interface UpdateUserResponse {
  status: boolean;
  message: string;
  data?: UserDetailDto | null;
}

// ── PATCH /api/admin/users/{id}/status  request ────────────────────────────
export interface UpdateUserStatusRequest {
  status: UserStatus;
}

// ── PATCH /api/admin/users/{id}/status  response ───────────────────────────
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

// ── DELETE /api/admin/users/{id}  response ─────────────────────────────────
export interface DeleteUserResponse {
  status: boolean;
  message: string;
}
