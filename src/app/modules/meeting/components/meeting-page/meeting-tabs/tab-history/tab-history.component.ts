import { Component, OnInit, Input, OnChanges, SimpleChanges } from '@angular/core';
import { MeetingTopic } from '@shared/models/topic';
import { MeetingHistory } from '@shared/models/meeting';
import { BarChartSegment } from '@shared/components/charts/bar-chart/bar-chart.component';

@Component({
  selector: 'app-tab-history',
  standalone: false, // Part of MeetingModule
  templateUrl: './tab-history.component.html',
  styleUrls: ['./tab-history.component.scss']
})
export class TabHistoryComponent implements OnInit, OnChanges {
  @Input() topic: MeetingTopic | null = null;
  
  chartSegments: BarChartSegment[] = [];

  get sessions(): MeetingHistory[] {
    return this.topic?.data?.histories || [];
  }

  constructor() {}

  ngOnInit(): void {
    this.updateChartData();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['topic']) {
      this.updateChartData();
    }
  }

  private updateChartData() {
    if (!this.sessions.length) {
      this.chartSegments = [];
      return;
    }

    // Sort sessions by date descending (newest first) for list, but maybe ascending for chart?
    // Let's take last 5 sessions for the chart for clarity, or all if few.
    // Chart: Duration per session
    this.chartSegments = this.sessions
      .slice(0, 10) // Limit to 10 most recent
      .map(session => ({
        label: new Date(session.startTime).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
        value: this.getDuration(session),
        color: '#42A5F5' // Blue color
      }));
  }

  exportSession(session: MeetingHistory) {
    if (session.attendanceCsvUrl) {
      window.open(session.attendanceCsvUrl, '_blank');
    } else {
      alert('No attendance record available for this session.');
    }
  }

  getDuration(session: MeetingHistory): number {
      if (!session.endTime) return 0;
      const start = new Date(session.startTime).getTime();
      const end = new Date(session.endTime).getTime();
      return Math.round((end - start) / 1000 / 60); // minutes
  }
}
