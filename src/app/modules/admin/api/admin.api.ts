import axiosInstance from '@shared/api/axios.api';

// DTOs
export interface AdminDashboardDTO {
  totalUsers: number;
  totalStudents: number;
  totalTeachers: number;
  totalAdmins: number;
  totalCourses: number;
  activeCourses: number;
  recentUsers: GetUserResponse[];
  recentCourses: GetCourseResponse[];
}

export interface GetUserResponse {
  id: string;
  username: string;
  email: string;
  role: string;
}

export interface GetCourseResponse {
  id: string;
  title: string;
  description?: string;
  isPublished: boolean;
  instructorId: string;
  thumbnailUrl?: string;
}

export interface UpdateUserRoleRequest {
  role: string;
}

export interface TogglePublishRequest {
  isPublished: boolean;
}

export interface UserStatisticsDTO {
  totalUsers: number;
  studentCount: number;
  teacherCount: number;
  adminCount: number;
  newUsersThisMonth: number;
  userGrowthRate: number;
}

export interface CourseStatisticsDTO {
  totalCourses: number;
  publishedCourses: number;
  unpublishedCourses: number;
  newCoursesThisMonth: number;
  courseGrowthRate: number;
}

// API Service
export class AdminAPI {
  private static readonly BASE_URL = '/Admin';

  // ========== DASHBOARD ==========
  static async getDashboard(): Promise<AdminDashboardDTO> {
    const response = await axiosInstance.get<AdminDashboardDTO>(
      `${this.BASE_URL}/dashboard`
    );
    return response.data;
  }

  // ========== USER MANAGEMENT ==========
  static async getAllUsers(
    role?: string,
    search?: string
  ): Promise<GetUserResponse[]> {
    const params = new URLSearchParams();
    if (role) params.append('role', role);
    if (search) params.append('search', search);

    const response = await axiosInstance.get<GetUserResponse[]>(
      `${this.BASE_URL}/users${params.toString() ? '?' + params.toString() : ''}`
    );
    return response.data;
  }

  static async getUserById(id: string): Promise<GetUserResponse> {
    const response = await axiosInstance.get<GetUserResponse>(
      `${this.BASE_URL}/users/${id}`
    );
    return response.data;
  }

  static async updateUserRole(
    id: string,
    request: UpdateUserRoleRequest
  ): Promise<any> {
    const response = await axiosInstance.put(
      `${this.BASE_URL}/users/${id}/role`,
      request
    );
    return response.data;
  }

  static async deleteUser(id: string): Promise<void> {
    await axiosInstance.delete(`${this.BASE_URL}/users/${id}`);
  }

  // ========== COURSE MANAGEMENT ==========
  static async getAllCourses(
    isPublished?: boolean,
    search?: string
  ): Promise<GetCourseResponse[]> {
    const params = new URLSearchParams();
    if (isPublished !== undefined) params.append('isPublished', String(isPublished));
    if (search) params.append('search', search);

    const response = await axiosInstance.get<GetCourseResponse[]>(
      `${this.BASE_URL}/courses${params.toString() ? '?' + params.toString() : ''}`
    );
    return response.data;
  }

  static async deleteCourse(id: string): Promise<void> {
    await axiosInstance.delete(`${this.BASE_URL}/courses/${id}`);
  }

  static async toggleCoursePublish(
    id: string,
    request: TogglePublishRequest
  ): Promise<GetCourseResponse> {
    const response = await axiosInstance.patch<GetCourseResponse>(
      `${this.BASE_URL}/courses/${id}/publish`,
      request
    );
    return response.data;
  }

  // ========== STATISTICS ==========
  static async getUserStatistics(
    startDate?: Date,
    endDate?: Date
  ): Promise<UserStatisticsDTO> {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate.toISOString());
    if (endDate) params.append('endDate', endDate.toISOString());

    const response = await axiosInstance.get<UserStatisticsDTO>(
      `${this.BASE_URL}/statistics/users${params.toString() ? '?' + params.toString() : ''}`
    );
    return response.data;
  }

  static async getCourseStatistics(
    startDate?: Date,
    endDate?: Date
  ): Promise<CourseStatisticsDTO> {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate.toISOString());
    if (endDate) params.append('endDate', endDate.toISOString());

    const response = await axiosInstance.get<CourseStatisticsDTO>(
      `${this.BASE_URL}/statistics/courses${params.toString() ? '?' + params.toString() : ''}`
    );
    return response.data;
  }
}
