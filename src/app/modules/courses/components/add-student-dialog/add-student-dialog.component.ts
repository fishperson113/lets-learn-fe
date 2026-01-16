import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { GetAllUsers } from '@shared/api/user.api';
import { User } from '@shared/models/user';

export interface AddStudentDialogData {
  courseId: string;
  currentStudents: User[];
}

export interface AddStudentDialogResult {
  studentId: string;
}

@Component({
  selector: 'add-student-dialog',
  standalone: false,
  templateUrl: './add-student-dialog.component.html',
  styleUrl: './add-student-dialog.component.scss',
})
export class AddStudentDialogComponent implements OnInit {
  availableStudents: User[] = [];
  filteredStudents: User[] = [];
  selectedStudent: User | null = null;
  searchQuery: string = '';
  loading: boolean = true;

  constructor(
    public dialogRef: MatDialogRef<AddStudentDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: AddStudentDialogData
  ) {}

  async ngOnInit() {
    try {
      // Fetch all users and filter out already enrolled students
      const allUsers = await GetAllUsers();
      const currentStudentIds = this.data.currentStudents.map(s => s.id);
      
      // Filter to get only students who are not already enrolled
      this.availableStudents = allUsers.filter(
        user => !currentStudentIds.includes(user.id) && user.role === 'Student'
      );
      
      this.filteredStudents = [...this.availableStudents];
      this.loading = false;
    } catch (error) {
      console.error('Error fetching users:', error);
      this.loading = false;
    }
  }

  onSearchChange() {
    const query = this.searchQuery.toLowerCase().trim();
    if (query === '') {
      this.filteredStudents = [...this.availableStudents];
    } else {
      this.filteredStudents = this.availableStudents.filter(
        student =>
          student.username.toLowerCase().includes(query) ||
          student.email.toLowerCase().includes(query)
      );
    }
  }

  selectStudent(student: User) {
    this.selectedStudent = student;
  }

  onCancel() {
    this.dialogRef.close();
  }

  onAdd() {
    if (!this.selectedStudent) {
      return;
    }
    const result: AddStudentDialogResult = {
      studentId: this.selectedStudent.id,
    };
    this.dialogRef.close(result);
  }
}
