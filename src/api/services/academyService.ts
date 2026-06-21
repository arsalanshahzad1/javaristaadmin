import adminApiClient from '../adminApiClient';
import type { QuizQuestion } from '../../types';

type ApiEnvelope<T> = { success: boolean; message: string; data: T };

export type LessonFormValues = {
  title: string;
  order: number;
  contentType: 'video' | 'text' | 'quiz';
  videoUrl: string;
  body: string;
  durationSeconds: number;
};

export type LessonRecord = LessonFormValues & { _id: string; questions?: QuizQuestion[] };

export async function saveLesson(payload: {
  courseId: string;
  lessonId?: string;
  values: LessonFormValues;
  questions?: QuizQuestion[];
}) {
  const body = {
    courseId: payload.courseId,
    title: payload.values.title,
    order: Number(payload.values.order),
    contentType: payload.values.contentType,
    videoUrl: payload.values.contentType === 'video' ? payload.values.videoUrl : undefined,
    body: payload.values.contentType === 'text' ? payload.values.body : undefined,
    durationSeconds: Number(payload.values.durationSeconds),
    questions: payload.values.contentType === 'quiz' ? (payload.questions ?? []) : [],
  };

  const response = payload.lessonId
    ? await adminApiClient.put<ApiEnvelope<LessonRecord>>(`/academy/lessons/${payload.lessonId}`, body)
    : await adminApiClient.post<ApiEnvelope<LessonRecord>>('/academy/lessons', body);

  return response.data;
}
