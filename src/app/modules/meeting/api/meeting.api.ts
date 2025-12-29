import { GET, POST } from '@shared/api/utils.api';

// Fetch a LiveKit access token for a topic meeting room
// Backend should verify the current user and issue a signed token.
export const GetMeetingToken = (
  topicId: string,
  courseId: string
): Promise<{ token: string; roomName: string; wsUrl: string; role: string; avatarUrl: string; name: string }> => {
  return GET(`/course/${courseId}/meeting/${topicId}/token`);
};

export const SaveMeetingHistory = (
  topicId: string,
  courseId: string,
  data: { startTime: string; endTime: string | null; attendeeCount: number; attendanceCsvUrl?: string }
): Promise<any> => {
  return POST(`/course/${courseId}/topic/${topicId}/meeting-history`, data);
};

