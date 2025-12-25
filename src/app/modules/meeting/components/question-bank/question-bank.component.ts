import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PollData, PollOption } from '../poll/poll-create/poll-create.component';

interface QuestionBankItem {
  id: string;
  topic: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  question: string;
  options: string[];
  correctOptionIndex?: number;
}

@Component({
  selector: 'app-question-bank',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './question-bank.component.html',
  styleUrls: ['./question-bank.component.scss']
})
export class QuestionBankComponent {
  @Output() selectQuestion = new EventEmitter<PollData>();
  @Output() close = new EventEmitter<void>();

  searchQuery: string = '';
  selectedTopic: string = 'All';
  selectedDifficulty: string = 'All';

  // Mock Data
  questions: QuestionBankItem[] = [
    {
      id: '1',
      topic: 'Math',
      difficulty: 'Easy',
      question: 'What is 2 + 2?',
      options: ['3', '4', '5', '6']
    },
    {
      id: '2',
      topic: 'Science',
      difficulty: 'Medium',
      question: 'What is the powerhouse of the cell?',
      options: ['Nucleus', 'Mitochondria', 'Ribosome', 'Golgi apparatus']
    },
    {
      id: '3',
      topic: 'History',
      difficulty: 'Hard',
      question: 'In which year did the Titanic sink?',
      options: ['1910', '1912', '1914', '1918']
    },
     {
      id: '4',
      topic: 'Math',
      difficulty: 'Medium',
      question: 'Square root of 144?',
      options: ['10', '11', '12', '14']
    }
  ];

  get filteredQuestions(): QuestionBankItem[] {
    return this.questions.filter(q => {
      const matchesSearch = q.question.toLowerCase().includes(this.searchQuery.toLowerCase());
      const matchesTopic = this.selectedTopic === 'All' || q.topic === this.selectedTopic;
      const matchesDiff = this.selectedDifficulty === 'All' || q.difficulty === this.selectedDifficulty;
      return matchesSearch && matchesTopic && matchesDiff;
    });
  }

  onSelect(item: QuestionBankItem) {
    const pollData: PollData = {
      question: item.question,
      options: item.options.map((opt, index) => ({ id: `${Date.now()}-${index}`, text: opt })),
      multipleChoice: false,
      anonymous: false
    };
    this.selectQuestion.emit(pollData);
  }

  onClose() {
    this.close.emit();
  }
}
