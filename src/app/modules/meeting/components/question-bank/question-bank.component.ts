import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PollData } from '../poll/poll-create/poll-create.component';
import { ActivatedRoute } from '@angular/router';
import { getQuestionBank } from '@modules/quiz/api/question.api';
import { Question, QuestionType } from '@shared/models/question';

@Component({
  selector: 'app-question-bank',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './question-bank.component.html',
  styleUrls: ['./question-bank.component.scss']
})
export class QuestionBankComponent implements OnInit {
  @Output() selectQuestion = new EventEmitter<PollData>();
  @Output() close = new EventEmitter<void>();

  searchQuery: string = '';
  questions: Question[] = [];
  courseId: string = '';

  constructor(private route: ActivatedRoute) {}

  ngOnInit(): void {
    // Try to get courseId from query params first
    this.route.queryParams.subscribe(params => {
      if (params['courseId']) {
        this.courseId = params['courseId'];
        this.loadQuestions();
      }
    });

    // Fallback or alternative if it's a route param (depending on how the meeting page is routed)
    // Assuming query param based on user context in URL logs: meeting/...?courseId=CS101
  }

  loadQuestions() {
    if (!this.courseId) return;
    
    getQuestionBank(this.courseId).then(questions => {
      this.questions = questions || [];
    }).catch(err => {
      console.error('Failed to load question bank', err);
    });
  }

  get filteredQuestions(): Question[] {
    if (!this.searchQuery.trim()) {
      return this.questions;
    }
    const query = this.searchQuery.toLowerCase();
    return this.questions.filter(q => 
      q.questionText.toLowerCase().includes(query) || 
      q.questionName.toLowerCase().includes(query)
    );
  }

  onSelect(question: Question) {
    let options: { id: string, text: string }[] = [];
    let multipleChoice = false;
    let type: 'Multiple Choice' | 'Short Answer' | 'True/False' = 'Multiple Choice';

    if (question.type === QuestionType.CHOICE && question.data && 'choices' in question.data) {
      options = question.data.choices.map((choice, index) => ({
        id: `${Date.now()}-${index}`,
        text: choice.text
      }));
      multipleChoice = (question.data as any).multiple;
      type = 'Multiple Choice';
    } else if (question.type === QuestionType.TRUE_FALSE) {
      options = [
        { id: `${Date.now()}-0`, text: 'True' },
        { id: `${Date.now()}-1`, text: 'False' }
      ];
      type = 'True/False';
    } else if (question.type === QuestionType.SHORT_ANSWER) {
       type = 'Short Answer';
       options = []; // No options for short answer
    }

    const pollData: PollData = {
      question: question.questionText,
      options: options,
      multipleChoice: multipleChoice,
      anonymous: false,
      type: type
    };
    this.selectQuestion.emit(pollData);
  }

  onClose() {
    this.close.emit();
  }
}
