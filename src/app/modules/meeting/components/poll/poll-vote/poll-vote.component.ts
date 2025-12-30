import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PollData } from '../poll-create/poll-create.component';

@Component({
  selector: 'app-poll-vote',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './poll-vote.component.html',
  styleUrls: ['./poll-vote.component.scss']
})
export class PollVoteComponent {
  @Input() poll!: PollData;
  @Output() submitVote = new EventEmitter<string[]>();

  selectedOptionId: string = ''; // For single choice
  selectedOptionIds: { [key: string]: boolean } = {}; // For multiple choice
  answerText: string = ''; // For short answer

  get isValid(): boolean {
    if (this.poll.type === 'Short Answer') {
        return this.answerText.trim().length > 0;
    }
    if (this.poll.multipleChoice) {
      return Object.values(this.selectedOptionIds).some(selected => selected);
    }
    return !!this.selectedOptionId;
  }

  submit() {
    if (!this.isValid) return;

    let votes: string[] = [];
    if (this.poll.type === 'Short Answer') {
        votes = [this.answerText];
    } else if (this.poll.multipleChoice) {
      votes = Object.keys(this.selectedOptionIds).filter(id => this.selectedOptionIds[id]);
    } else {
      votes = [this.selectedOptionId];
    }

    this.submitVote.emit(votes);
  }
}
