import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { Router } from '@angular/router';
import { ComboboxService } from '@shared/components/combobox/combobox.service';
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
  providers: [ComboboxService],
})
export class NewCourseFormComponent implements OnInit {
  showPassword = false;
  form!: FormGroup<INewCourseFormSchema>;
  formControls = newCourseFormControls;

  visibilityValue = '0';
  loading = false;

  constructor(
    private fb: FormBuilder,
    private comboboxService: ComboboxService,
    private toastService: ToastrService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group(newCourseFormSchema);
    this.comboboxService.selectedOption$.subscribe((option) => {
      this.visibilityValue = option?.value || 'default';
    });
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  onSubmit(e: Event) {
    e.preventDefault(); // Prevent default form submission
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const data: INewCourseFormData = this.form.getRawValue();
    this.loading = true;
   
  }
}
