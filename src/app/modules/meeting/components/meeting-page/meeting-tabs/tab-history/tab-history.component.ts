import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

interface MeetingSession {
  id: string;
  date: Date;
  duration: number; // minutes
  attendees: number;
}

interface PastPoll {
  id: string;
  question: string;
  date: Date;
  totalVotes: number;
  winner: string;
}

@Component({
  selector: 'app-tab-history',
  standalone: false, // Part of MeetingModule
  templateUrl: './tab-history.component.html',
  styleUrls: ['./tab-history.component.scss']
})
export class TabHistoryComponent implements OnInit {
  
  sessions: MeetingSession[] = [
    { id: '1', date: new Date(Date.now() - 86400000), duration: 45, attendees: 12 },
    { id: '2', date: new Date(Date.now() - 172800000), duration: 60, attendees: 15 }
  ];

  polls: PastPoll[] = [
    { id: 'p1', question: 'What is 2+2?', date: new Date(Date.now() - 86400000), totalVotes: 12, winner: '4' },
    { id: 'p2', question: 'Best framework?', date: new Date(Date.now() - 172800000), totalVotes: 15, winner: 'Angular' }
  ];

  constructor() {}

  ngOnInit(): void {}

  exportSession(id: string) {
    console.log('Exporting session', id);
    alert('Exporting attendance for session ' + id);
  }

  exportPoll(id: string) {
    console.log('Exporting poll', id);
    alert('Exporting results for poll ' + id);
  }
}
