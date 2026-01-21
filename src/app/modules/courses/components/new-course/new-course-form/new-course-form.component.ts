import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { Router } from '@angular/router';
import { CreateCourse } from '@modules/courses/api/courses.api';
import { ToastrService } from 'ngx-toastr';
import {
  INewCourseFormData,
  INewCourseFormSchema,
  newCourseFormControls,
  newCourseFormSchema,
} from './new-course-form.config';

@Component({
  selector: 'new-course-form',
  standalone: false,
  templateUrl: './new-course-form.component.html',
  styleUrl: './new-course-form.component.scss',
})
export class NewCourseFormComponent implements OnInit {
  showPassword = false;
  form!: FormGroup<INewCourseFormSchema>;
  formControls = newCourseFormControls;

  visibilityValue = '0';
  loading = false;

  constructor(
    private fb: FormBuilder,
    private toastService: ToastrService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group(newCourseFormSchema);
    
    // Subscribe to visibility form control changes
    this.form.get('visibility')?.valueChanges.subscribe((value) => {
      this.visibilityValue = value || 'default';
    });
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  async onSubmit(e: Event) {
    e.preventDefault(); // Prevent default form submission
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const data: INewCourseFormData = this.form.getRawValue();
    this.loading = true;
    await CreateCourse(data)
      .then((course) => {
        this.toastService.success(`Course created successfully!`);
        this.router.navigate(['/courses', course.id]);
      })
      .catch((error) => {
        this.toastService.error(error.message);
      })
      .finally(() => {
        this.loading = false;
      });
  }
}
