'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  ApplicationDetail,
  ApplicationSummary,
  CreateApplicationInput,
  JobView,
  MasterProfile,
  MeResponse,
  ProfileResponse,
  UpdateApplicationInput,
} from '@fitcv/shared';
import { api, ApiClientError } from './api';

export const keys = {
  me: ['me'] as const,
  profile: ['profile'] as const,
  applications: ['applications'] as const,
  application: (id: string) => ['applications', id] as const,
  job: (id: string) => ['jobs', id] as const,
};

export function useMe() {
  return useQuery({
    queryKey: keys.me,
    queryFn: () => api<MeResponse>('/auth/me'),
    retry: (count, err) => !(err instanceof ApiClientError && err.status === 401) && count < 2,
    staleTime: 30_000,
  });
}

export function useProfile() {
  return useQuery({ queryKey: keys.profile, queryFn: () => api<ProfileResponse>('/profile') });
}

export function useSaveProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (profile: MasterProfile) =>
      api<ProfileResponse>('/profile', { method: 'PUT', json: profile }),
    onSuccess: (data) => {
      qc.setQueryData(keys.profile, data);
      // Match scores are computed against the profile; refresh them.
      void qc.invalidateQueries({ queryKey: keys.applications });
    },
  });
}

export function useApplications() {
  return useQuery({
    queryKey: keys.applications,
    queryFn: () => api<{ applications: ApplicationSummary[] }>('/applications'),
    select: (d) => d.applications,
  });
}

export function useApplication(id: string) {
  return useQuery({
    queryKey: keys.application(id),
    queryFn: () => api<{ application: ApplicationDetail }>(`/applications/${id}`),
    select: (d) => d.application,
    // Poll while an AI job is running.
    refetchInterval: (q) => {
      const s = q.state.data?.application.activeJob?.status;
      return s === 'PENDING' || s === 'RUNNING' ? 2000 : false;
    },
  });
}

export function useCreateApplication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateApplicationInput) =>
      api<{ application: ApplicationSummary }>('/applications', { method: 'POST', json: input }),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.applications }),
  });
}

export function useUpdateApplication(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: UpdateApplicationInput) =>
      api<{ application: ApplicationSummary }>(`/applications/${id}`, {
        method: 'PATCH',
        json: patch,
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: keys.application(id) });
      void qc.invalidateQueries({ queryKey: keys.applications, exact: true });
    },
  });
}

export function useDeleteApplication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api<void>(`/applications/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.applications }),
  });
}

export function useStartJob(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (kind: 'analyze' | 'generate') =>
      api<{ job: JobView }>(`/applications/${id}/${kind}`, { method: 'POST' }),
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: keys.application(id) });
      void qc.invalidateQueries({ queryKey: keys.me });
    },
  });
}

export function useJob(jobId: string | null) {
  return useQuery({
    queryKey: keys.job(jobId ?? 'none'),
    queryFn: () => api<{ job: JobView }>(`/jobs/${jobId}`),
    enabled: !!jobId,
    select: (d) => d.job,
    refetchInterval: (q) => {
      const s = q.state.data?.job.status;
      return s === 'SUCCEEDED' || s === 'FAILED' ? false : 1500;
    },
  });
}
