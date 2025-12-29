export type MeetingData = {
  description: string;
  open: string | null;
  close: string | null;
  histories?: MeetingHistory[];
}

export type MeetingHistory = {
  id: string;
  topicMeetingId: string;
  startTime: string;
  endTime: string | null;
  attendeeCount: number;
  attendanceCsvUrl?: string;
}
