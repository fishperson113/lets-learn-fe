import { Component, Input, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { AddStudentToCourse, GetCourseById } from '@modules/courses/api/courses.api';
import { AddStudentDialogComponent, AddStudentDialogResult } from '../../../add-student-dialog/add-student-dialog.component';
import { Course } from '@shared/models/course';
import { User } from '@shared/models/user';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'tab-people',
  standalone: false,
  templateUrl: './tab-people.component.html',
  styleUrl: './tab-people.component.scss'
})
export class TabPeopleComponent implements OnInit {
  @Input({ required: true }) course!: Course;
  @Input() canEdit = true;

  get instructor(): User | null {
    return this.course?.creator ?? null;
  }

  get members(): User[] {
    return this.course?.students ?? [];
  }

  constructor(
    private toastr: ToastrService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {}

  openAddStudentDialog() {
    const dialogRef = this.dialog.open(AddStudentDialogComponent, {
      width: '500px',
      data: {
        courseId: this.course.id,
        currentStudents: this.members,
      },
    });

    dialogRef.afterClosed().subscribe(async (result: AddStudentDialogResult) => {
      if (result && result.studentId) {
        await this.addStudentToCourse(result.studentId);
      }
    });
  }

  async addStudentToCourse(studentId: string) {
    try {
      await AddStudentToCourse(this.course.id, studentId);
      this.toastr.success('Student added successfully to the course!');
      
      // Refresh the course data to update the members list
      const updatedCourse = await GetCourseById(this.course.id);
      this.course.students = updatedCourse.students;
    } catch (error: any) {
      console.error('Error adding student:', error);
      this.toastr.error(error.message || 'Failed to add student to course');
    }
  }
}

