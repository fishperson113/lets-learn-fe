import { convertCloudinaryFilesToRequestData } from '@shared/helper/cloudinary.api.helper';
import {
  AssignmentResponseData,
  StudentResponse,
} from '@shared/models/student-response';

export const convertAssignmentResponseToRequestData = (
  assignmentResponse: StudentResponse
) => {
  const { id, data, topicId, studentId } = assignmentResponse;
  const { submittedAt, files, mark, note } = data as AssignmentResponseData;
  let req: any = {
    topicId,
    studentId,
    data: {
      submittedAt,
      files: convertCloudinaryFilesToRequestData(files),
      mark,
      note,
    }
  };
  return req;
};

export const convertAssignmentResponseFromResponseData = (
  data: any
): StudentResponse => {
  const { id, topicId, studentId, submittedAt, cloudinaryFiles, mark, note } =
    data;
  const res: StudentResponse = {
    id,
    topicId,
    studentId,
    data: {
      submittedAt,
      files: cloudinaryFiles,
      mark,
      note,
    },
  };
  return res;
};
