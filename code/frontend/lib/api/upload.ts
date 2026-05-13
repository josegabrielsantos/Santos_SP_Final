import { useMutation } from '@tanstack/react-query';
import axiosInstance from '@/lib/axios';
import type { UploadResponse } from '@/lib/types';

export function useUploadFile() {
  return useMutation({
    mutationFn: async ({ file, folder }: { file: File; folder: string }) => {
      const form = new FormData();
      form.append('file', file);
      form.append('folder', folder);

      const { data } = await axiosInstance.post<UploadResponse>('/upload', form, {
        headers: { 'Content-Type': undefined },
      });
      return data;
    },
  });
}

export function useDeleteUploadedFile() {
  return useMutation({
    mutationFn: async ({ url }: { url: string }) => {
      const { data } = await axiosInstance.delete('/upload', {
        data: { url },
      });
      return data;
    },
  });
}
