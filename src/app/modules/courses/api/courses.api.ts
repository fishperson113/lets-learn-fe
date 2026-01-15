import { GET, PATCH, POST, PUT } from '@shared/api/utils.api';
import { Course } from '@shared/models/course';
import {
  convertCourseFromResponseData,
  convertCourseToCreateRequestData,
  convertCourseToUpdateRequestData,
  convertCourseWorkFromResponseData,
} from '../helper/courses.api.helper';
import { INewCourseFormData } from '../components/new-course/new-course-form/new-course-form.config';

export const CreateCourse = (newCourseFormData: INewCourseFormData) => {
  let data = convertCourseToCreateRequestData(newCourseFormData);
  return POST('/course', data);
};

export const GetCourseById = (courseId: string): Promise<Course> => {
  return GET(`/course/${courseId}`);
};

export const GetPublicCourses = (): Promise<Course[]> => {
  return GET('/course');
};

export const GetStudentCourses = (studentId: string): Promise<Course[]> => {
  return GET(`/course?studentId=${studentId}`);
};

export const GetTeacherCourses = (userId: string): Promise<Course[]> => {
  return GET(`/course?userId=${userId}`);
};

export const UpdateCourse = (course: Course) => {
  const data = convertCourseToUpdateRequestData(course);
  return PUT(`/course/${course.id}`, data);
};

export const JoinCourse = (courseId: string): Promise<void> => {
  return PATCH(`/course/${courseId}/join`);
};

// Add student to course (Teacher functionality)
export const AddStudentToCourse = (courseId: string, studentId: string): Promise<void> => {
  return POST(`/course/${courseId}/student`, { studentId });
};

// Get working topics of courses (E.g. quizzes, assignments)
export const GetCourseWork = (
  courseId: string,
  type: 'quiz' | 'assignment' | 'meeting' | null
) => {
  const url = type
    ? `/course/${courseId}/work?type=${type}`
    : `/course/${courseId}/work`;
  return GET(url).then(convertCourseWorkFromResponseData);
};

// Clone course
export interface CloneCourseRequest {
  newCourseId: string;
  title: string;
  description?: string;
  imageUrl?: string;
  category: string;
  level: string;
  price?: number;
  isPublished: boolean;
}

export interface CloneCourseResponse {
  id: string;
  sourceCourseId: string;
  sectionCount: number;
  topicCount: number;
}

export const CloneCourse = (
  sourceCourseId: string,
  request: CloneCourseRequest
): Promise<CloneCourseResponse> => {
  return POST(`/course/${sourceCourseId}/clone`, request);
};
