import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormControl, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { CloneCourse, GetTeacherCourses } from '@modules/courses/api/courses.api';
import { Course } from '@shared/models/course';
import { UserService } from '@shared/services/user.service';
import { ToastrService } from 'ngx-toastr';

interface CloneCourseFormSchema {
  sourceCourseId: FormControl<string | null>;
  newCourseId: FormControl<string | null>;
  title: FormControl<string | null>;
  category: FormControl<string | null>;
  level: FormControl<string | null>;
  visibility: FormControl<'0' | '1' | null>;
}

@Component({
  selector: 'clone-course-form',
  standalone: false,
  templateUrl: './clone-course-form.component.html',
  styleUrl: './clone-course-form.component.scss',
})
export class CloneCourseFormComponent implements OnInit {
  form!: FormGroup;
  loading = false;
  loadingCourses = true;
  availableCourses: Course[] = [];
  selectedCourse: Course | null = null;
  visibilityValue = '0';

  constructor(
    private fb: FormBuilder,
    private toastService: ToastrService,
    private router: Router,
    private userService: UserService
  ) {}

  async ngOnInit(): Promise<void> {
    this.form = this.fb.group({
      sourceCourseId: new FormControl('', {
        validators: [Validators.required],
        nonNullable: true,
      }),
      newCourseId: new FormControl('', {
        validators: [Validators.required, Validators.minLength(2)],
        nonNullable: true,
      }),
      title: new FormControl('', {
        validators: [Validators.required, Validators.minLength(3)],
        nonNullable: true,
      }),
      category: new FormControl('Academic', {
        validators: [Validators.required, Validators.minLength(3)],
        nonNullable: true,
      }),
      level: new FormControl('beginner', {
        validators: [Validators.required],
        nonNullable: true,
      }),
      visibility: new FormControl(null, {
        validators: [Validators.required],
        nonNullable: true,
      }),
    });

    // Subscribe to visibility form control changes
    this.form.get('visibility')?.valueChanges.subscribe((value) => {
      this.visibilityValue = value || '0';
    });

    // Load teacher's courses
    await this.loadTeacherCourses();

    // Watch for source course changes
    this.form.get('sourceCourseId')?.valueChanges.subscribe((courseId) => {
      if (courseId) {
        this.onSourceCourseChange(courseId);
      }
    });
  }

  async loadTeacherCourses(): Promise<void> {
    try {
      const user = this.userService.getUser();
      if (!user) {
        this.toastService.error('User not found');
        return;
      }

      this.loadingCourses = true;
      this.availableCourses = await GetTeacherCourses(user.id);
    } catch (error: any) {
      this.toastService.error(error.message || 'Failed to load courses');
    } finally {
      this.loadingCourses = false;
    }
  }

  onSourceCourseChange(courseId: string): void {
    const course = this.availableCourses.find((c) => c.id === courseId);
    if (course) {
      this.selectedCourse = course;
      // Pre-fill form with source course data
      this.form.patchValue({
        title: `${course.title} (Copy)`,
        category: course.category,
        level: course.level?.toLowerCase() || 'beginner',
      });
    }
  }

  async onSubmit(e: Event): Promise<void> {
    e.preventDefault();
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const formData = this.form.getRawValue();
    const cloneRequest = {
      newCourseId: formData.newCourseId,
      title: formData.title,
      description: this.selectedCourse?.description || '',
      imageUrl: this.selectedCourse?.imageUrl || '',
      category: formData.category,
      level: formData.level,
      price: this.selectedCourse?.price || 0,
      isPublished: formData.visibility === '1',
    };

    this.loading = true;
    try {
      if (!formData.sourceCourseId) {
        throw new Error('Source course ID is required');
      }
      const response = await CloneCourse(formData.sourceCourseId, cloneRequest);
      this.toastService.success(
        `Course cloned successfully! ${response.sectionCount} sections and ${response.topicCount} topics copied.`
      );
      this.router.navigate(['/courses', response.id]);
    } catch (error: any) {
      this.toastService.error(error.message || 'Failed to clone course');
    } finally {
      this.loading = false;
    }
  }
}
