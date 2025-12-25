import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PollData } from '../poll-create/poll-create.component';

@Component({
  selector: 'app-poll-result',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './poll-result.component.html',
  styleUrls: ['./poll-result.component.scss']
})
export class PollResultComponent implements OnChanges {
  @Input() poll!: PollData;
  @Input() results: { [optionId: string]: number } = {};
  @Input() totalVotes: number = 0;
  @Input() isHost: boolean = false;
  @Input() isActive: boolean = true;
  
  @Output() closePoll = new EventEmitter<void>();

  maxVotes: number = 0;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['results']) {
      this.calculateMax();
    }
  }

  calculateMax() {
    this.maxVotes = Math.max(...Object.values(this.results), 0);
  }

  getPercentage(optionId: string): number {
    if (this.totalVotes === 0) return 0;
    return Math.round(((this.results[optionId] || 0) / this.totalVotes) * 100);
  }

  onClose() {
    this.closePoll.emit();
  }
}
