export interface DashboardSummaryDto {
  totalUsers: number;
  totalBlogs: number;
}

export interface GetDashboardSummaryResponse {
  status: boolean;
  message: string;
  data?: DashboardSummaryDto | null;
}

export interface UserStatusCountsDto {
  active: number;
  inactive: number;
}

export interface CategoryStatusCountsDto {
  active: number;
  inactive: number;
}

export interface DashboardStatusDto {
  users: UserStatusCountsDto;
  categories: CategoryStatusCountsDto;
}

export interface GetDashboardStatusResponse {
  status: boolean;
  message: string;
  data?: DashboardStatusDto | null;
}

export interface LatestBlogItemDto {
  id: string;
  title: string;
  authorName: string;
  createdAt: string;
}

export interface MonthlyBlogCountDto {
  month: string;
  count: number;
}

export interface DashboardBlogsDto {
  latestBlogs: LatestBlogItemDto[];
  monthlyBlogCounts: MonthlyBlogCountDto[];
}

export interface GetDashboardBlogsResponse {
  status: boolean;
  message: string;
  data?: DashboardBlogsDto | null;
}
