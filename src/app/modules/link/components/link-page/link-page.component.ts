import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import {
  LINK_STUDENT_TABS,
  LINK_TEACHER_TABS,
  LinkTab,
} from '@modules/link/constants/link.constant';
import { TabService } from '@shared/components/tab-list/tab-list.service';
import { Course } from '@shared/models/course';
import { LinkTopic, TopicType } from '@shared/models/topic';
import { Role, User } from '@shared/models/user';
import { BreadcrumbService } from '@shared/services/breadcrumb.service';
import { UserService } from '@shared/services/user.service';
import { mockTopics } from '@shared/mocks/topic';
import { mockCourses } from '@shared/mocks/course';
// import { GetTopic } from '@modules/courses/api/topic.api';
// import { GetCourseById } from '@modules/courses/api/courses.api';
@Component({
  selector: 'app-link-page',
  standalone: false,
  templateUrl: './link-page.component.html',
  styleUrls: ['./link-page.component.scss'],
  providers: [TabService],
})
export class LinkPageComponent implements OnInit {
  course: Course | null = null;
  topic: LinkTopic = mockTopics.find(topic => topic.type === TopicType.LINK) as LinkTopic;
  tabs = LinkTab;
  user: User | null = null;
  isStudent = true;
  selectedTab = LinkTab.LINK;
  courseId: string | null = null;
  topicId: string | null = null;

  constructor(
    private tabService: TabService<LinkTab>,
    private userService: UserService,
    private breadcrumbService: BreadcrumbService,
    private activedRoute: ActivatedRoute,
    private cdr: ChangeDetectorRef
  ) {
    this.topicId = this.activedRoute.snapshot.paramMap.get('topicId');
    this.courseId = this.activedRoute.snapshot.paramMap.get('courseId');
    
    // Fetch mock data based on route params
    if (this.courseId) this.fetchCourseData(this.courseId);
    if (this.topicId) this.fetchTopicData(this.topicId);
    
    // Create mock topic for frontend preview when API is not available
    //this.createMockTopic();
    
    // if (this.courseId) this.fetchCourseData(this.courseId);
    // if (this.topicId && this.courseId) this.fetchTopicData(this.topicId, this.courseId);
  }
  ngOnInit(): void {
    this.tabService.setTabs(LINK_STUDENT_TABS);
    this.tabService.selectedTab$.subscribe((tab) => {
      if (tab) {
        this.selectedTab = tab;
        this.cdr.detectChanges();
      }
    });

    // Create mock teacher user for frontend preview
    const mockTeacherUser: User = {
      id: 'mock-teacher-id',
      username: 'mockteacher',
      email: 'teacher@example.com',
      password: 'mock-password',
      avatar: 'https://via.placeholder.com/150',
      role: Role.TEACHER,
      courses: []
    };
    
    // Set mock user to see both tabs
    this.userService.setUser(mockTeacherUser);

    this.userService.user$.subscribe((user) => {
      this.user = user;
      if (user?.role === Role.TEACHER) {
        this.tabService.setTabs(LINK_TEACHER_TABS);
        this.isStudent = false;
      } else {
        this.tabService.setTabs(LINK_STUDENT_TABS);
        this.isStudent = true;
      }
    });
  }

  // async fetchTopicData(topicId: string, courseId: string) {
  //   try {
  //     this.topic = await GetTopic(topicId, courseId) as LinkTopic;
  //     // Update breadcrumb after both course and topic are loaded
  //     if (this.course && this.topic) {
  //       this.updateBreadcrumb(this.course, this.topic);
  //     }
  //   } catch (error) {
  //     console.error('Error fetching topic data:', error);
  //     this.topic = null;
  //   }
  // }

  // async fetchCourseData(courseId: string) {
  //   try {
  //     this.course = await GetCourseById(courseId);
  //     // Update breadcrumb after both course and topic are loaded
  //     if (this.course && this.topic) {
  //       this.updateBreadcrumb(this.course, this.topic);
  //     }
  //   } catch (error) {
  //     console.error('Error fetching course data:', error);
  //     this.course = null;
  //   }
  // }

  fetchTopicData(topicId: string) {
      const res = mockTopics.find((topic) => topic.id === topicId);
      if (res) this.topic = res as LinkTopic;
    }
  
    fetchCourseData(courseId: string) {
      const res = mockCourses.find((course) => course.id === courseId);
      if (res) this.course = res;
    }

  updateBreadcrumb(course: Course, topic: LinkTopic) {
    this.breadcrumbService.setBreadcrumbs([
      {
        label: course.title,
        url: `/courses/${course.id}`,
        active: false,
      },
      {
        label: topic.title,
        url: `/courses/${course.id}/link/${topic.id}`,
        active: true,
      },
    ]);
  }

  createMockTopic() {
    // Create mock topic for frontend preview when API is not available
    this.topic = {
      id: this.topicId || 'mock-link-topic-id',
      sectionId: 'mock-section-id',
      title: 'Sample Link Topic',
      type: TopicType.LINK,
      course: {
        id: this.courseId || 'mock-course-id',
        title: 'Sample Course'
      } as Course,
      data: {
        url: 'https://example.com',
        description: 'Sample external link description'
      }
    };
  }
}
