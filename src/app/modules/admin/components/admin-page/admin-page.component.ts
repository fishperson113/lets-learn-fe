import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { 
  AdminAPI, 
  AdminDashboardDTO, 
  GetUserResponse, 
  GetCourseResponse,
  UserStatisticsDTO,
  CourseStatisticsDTO 
} from '../../api/admin.api';
import { UserService } from '@shared/services/user.service';
import { Role } from '@shared/models/user';

@Component({
  selector: 'app-admin-page',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './admin-page.component.html',
  styleUrl: './admin-page.component.scss'
})
export class AdminPageComponent implements OnInit, OnDestroy {
  dashboard: AdminDashboardDTO | null = null;
  users: GetUserResponse[] = [];
  courses: GetCourseResponse[] = [];
  userStats: UserStatisticsDTO | null = null;
  courseStats: CourseStatisticsDTO | null = null;
  
  loading = true;
  error: string | null = null;
  isAuthorized = false;
  
  // Filters
  activeTab: 'dashboard' | 'users' | 'courses' | 'statistics' = 'dashboard';
  userRoleFilter: string = '';
  userSearchQuery: string = '';
  coursePublishFilter: boolean | null = null;
  courseSearchQuery: string = '';

  constructor(private userService: UserService) {}

  ngOnInit() {
    const currentUser = this.userService.getUser();
    
    if (!currentUser || currentUser.role !== Role.ADMIN) {
      this.isAuthorized = false;
      this.loading = false;
      this.error = 'Access Denied: You do not have permission to view this page.';
      return;
    }
    
    this.isAuthorized = true;
    this.loadDashboard();
  }

  ngOnDestroy() {
    // Clean up if needed
  }

  async loadDashboard() {
    try {
      this.loading = true;
      this.error = null;
      this.dashboard = await AdminAPI.getDashboard();
    } catch (err: any) {
      this.error = err.message || 'Failed to load dashboard';
      console.error('Error loading dashboard:', err);
    } finally {
      this.loading = false;
    }
  }

  async loadUsers() {
    try {
      this.loading = true;
      this.error = null;
      this.users = await AdminAPI.getAllUsers(
        this.userRoleFilter || undefined,
        this.userSearchQuery || undefined
      );
    } catch (err: any) {
      this.error = err.message || 'Failed to load users';
      console.error('Error loading users:', err);
    } finally {
      this.loading = false;
    }
  }

  async loadCourses() {
    try {
      this.loading = true;
      this.error = null;
      this.courses = await AdminAPI.getAllCourses(
        this.coursePublishFilter !== null ? this.coursePublishFilter : undefined,
        this.courseSearchQuery || undefined
      );
    } catch (err: any) {
      this.error = err.message || 'Failed to load courses';
      console.error('Error loading courses:', err);
    } finally {
      this.loading = false;
    }
  }

  async loadStatistics() {
    try {
      this.loading = true;
      this.error = null;
      [this.userStats, this.courseStats] = await Promise.all([
        AdminAPI.getUserStatistics(),
        AdminAPI.getCourseStatistics()
      ]);
    } catch (err: any) {
      this.error = err.message || 'Failed to load statistics';
      console.error('Error loading statistics:', err);
    } finally {
      this.loading = false;
    }
  }

  switchTab(tab: 'dashboard' | 'users' | 'courses' | 'statistics') {
    this.activeTab = tab;
    this.error = null;

    switch (tab) {
      case 'dashboard':
        this.loadDashboard();
        break;
      case 'users':
        this.loadUsers();
        break;
      case 'courses':
        this.loadCourses();
        break;
      case 'statistics':
        this.loadStatistics();
        break;
    }
  }

  onUserRoleFilterChange(role: string) {
    this.userRoleFilter = role;
    this.loadUsers();
  }

  onUserSearchChange(query: string) {
    this.userSearchQuery = query;
    this.loadUsers();
  }

  onCoursePublishFilterChange(isPublished: boolean | null) {
    this.coursePublishFilter = isPublished;
    this.loadCourses();
  }

  onCourseSearchChange(query: string) {
    this.courseSearchQuery = query;
    this.loadCourses();
  }

  async deleteUser(userId: string) {
    if (!confirm('Are you sure you want to delete this user?')) {
      return;
    }

    try {
      await AdminAPI.deleteUser(userId);
      this.loadUsers();
    } catch (err: any) {
      this.error = err.message || 'Failed to delete user';
      console.error('Error deleting user:', err);
    }
  }

  async deleteCourse(courseId: string) {
    if (!confirm('Are you sure you want to delete this course?')) {
      return;
    }

    try {
      await AdminAPI.deleteCourse(courseId);
      this.loadCourses();
    } catch (err: any) {
      this.error = err.message || 'Failed to delete course';
      console.error('Error deleting course:', err);
    }
  }

  async toggleCoursePublish(courseId: string, currentStatus: boolean) {
    try {
      await AdminAPI.toggleCoursePublish(courseId, { isPublished: !currentStatus });
      this.loadCourses();
    } catch (err: any) {
      this.error = err.message || 'Failed to toggle course publish status';
      console.error('Error toggling course publish:', err);
    }
  }
}
