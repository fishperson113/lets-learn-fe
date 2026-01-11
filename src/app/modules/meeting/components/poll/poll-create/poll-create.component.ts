import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface PollOption {
  id: string;
  text: string;
}

export interface PollData {
  question: string;
  options: PollOption[];
  multipleChoice: boolean;
  anonymous: boolean;
  type?: 'Multiple Choice' | 'Short Answer' | 'True/False';
}

import { QuestionBankComponent } from '../../question-bank/question-bank.component';

@Component({
  selector: 'app-poll-create',
  standalone: true,
  imports: [CommonModule, FormsModule, QuestionBankComponent],
  templateUrl: './poll-create.component.html',
  styleUrls: ['./poll-create.component.scss'] // Fixed typo from 'styles'
})
export class PollCreateComponent {
  @Output() createPoll = new EventEmitter<PollData>();
  @Output() cancel = new EventEmitter<void>();

  showQuestionBank = false;


  question: string = '';
  options: PollOption[] = [
    { id: '1', text: '' },
    { id: '2', text: '' }
  ];
  multipleChoice: boolean = false;
  anonymous: boolean = false;
  type: 'Multiple Choice' | 'Short Answer' | 'True/False' = 'Multiple Choice';

  addOption() {
    this.options.push({
      id: Date.now().toString(),
      text: ''
    });
  }

  removeOption(index: number) {
    this.options.splice(index, 1);
  }

  isValid(): boolean {
    if (this.type === 'Short Answer' || this.type === 'True/False') {
        return this.question.trim().length > 0;
    }
    return this.question.trim().length > 0 && 
           this.options.filter(o => o.text.trim().length > 0).length >= 2;
  }

  onSubmit() {
    if (this.isValid()) {
      let finalOptions = this.options.filter(o => o.text.trim().length > 0);
      
      if (this.type === 'Short Answer') {
        finalOptions = [];
      } else if (this.type === 'True/False') {
        finalOptions = [
          { id: 'true', text: 'True' },
          { id: 'false', text: 'False' }
        ];
      }

      this.createPoll.emit({
        question: this.question,
        options: finalOptions,
        multipleChoice: this.type === 'Multiple Choice' ? this.multipleChoice : false,
        anonymous: this.anonymous,
        type: this.type
      });
    }
  }

  onCancel() {
    this.cancel.emit();
  }

  toggleQuestionBank() {
    this.showQuestionBank = !this.showQuestionBank;
  }

  onQuestionSelected(data: PollData) {
    this.question = data.question;
    this.options = data.options;
    this.multipleChoice = data.multipleChoice;
    this.showQuestionBank = false;
    this.type = data.type || 'Multiple Choice';
  }
}
