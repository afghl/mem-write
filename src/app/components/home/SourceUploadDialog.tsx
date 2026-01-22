"use client";

import { useEffect, useMemo, useState } from 'react';
import { Link2, UploadCloud, X } from 'lucide-react';

type SourceUploadDialogProps = {
  open: boolean;
  onClose: () => void;
  projectId: string;
  onUploaded?: () => void;
};

const isYouTubeUrl = (value: string) => {
  const patterns = [
    /youtu\.be\/([^?&/]+)/i,
    /youtube\.com\/watch\?v=([^?&/]+)/i,
    /youtube\.com\/embed\/([^?&/]+)/i,
    /youtube\.com\/shorts\/([^?&/]+)/i,
  ];
  return patterns.some((pattern) => pattern.test(value));
};

const isPdfFile = (file: File | null) => {
  if (!file) return false;
  const lowerName = file.name.toLowerCase();
  return file.type === 'application/pdf' || lowerName.endsWith('.pdf');
};

export default function SourceUploadDialog({
  open,
  onClose,
  projectId,
  onUploaded,
}: SourceUploadDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      setFile(null);
      setUrl('');
      setError(null);
      setStatus(null);
      setIsSubmitting(false);
      return;
    }

    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  }, [open, onClose]);

  const trimmedProjectId = projectId.trim();
  const trimmedUrl = url.trim();
  const urlError = trimmedUrl && !isYouTubeUrl(trimmedUrl) ? '请输入有效的 YouTube 链接' : null;
  const fileError = file && !isPdfFile(file) ? '仅支持上传 PDF 文件' : null;

  const canSubmit = useMemo(() => {
    if (!trimmedProjectId) return false;
    if (fileError || urlError) return false;
    return Boolean(file) || Boolean(trimmedUrl);
  }, [file, fileError, trimmedProjectId, trimmedUrl, urlError]);

  const handleFileChange = (nextFile: File | null) => {
    setFile(nextFile);
    if (nextFile) setUrl('');
    setError(null);
    setStatus(null);
  };

  const handleUrlChange = (nextUrl: string) => {
    setUrl(nextUrl);
    if (nextUrl.trim()) setFile(null);
    setError(null);
    setStatus(null);
  };

  const handleSubmit = async () => {
    if (!canSubmit || isSubmitting) return;
    setIsSubmitting(true);
    setError(null);
    setStatus(null);

    const formData = new FormData();
    formData.append('project_id', trimmedProjectId);
    if (file) {
      formData.append('file', file);
    } else if (trimmedUrl) {
      formData.append('url', trimmedUrl);
    }

    try {
      const response = await fetch('/api/sources/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('上传失败');
      }

      setFile(null);
      setUrl('');
      setStatus('已提交到后台处理中');
      onUploaded?.();
    } catch (submitError) {
      console.error('Source upload failed:', submitError);
      setError('上传失败，请稍后重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/30"
        onClick={onClose}
        role="presentation"
      />
      <div
        className="relative w-full max-w-md mx-4 rounded-2xl bg-white shadow-xl border border-gray-200"
        role="dialog"
        aria-modal="true"
        aria-label="Upload source dialog"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800">添加附件</h3>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 text-gray-500"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <UploadCloud size={16} />
              上传 PDF
            </div>
            <label className="flex flex-col items-center justify-center gap-2 border border-dashed border-gray-200 rounded-xl px-4 py-6 text-sm text-gray-500 cursor-pointer hover:border-blue-400 hover:text-blue-600 transition-colors">
              <input
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={(event) => handleFileChange(event.target.files?.[0] ?? null)}
              />
              <span>{file ? file.name : '点击选择 PDF 文件'}</span>
              <span className="text-xs text-gray-400">仅支持 PDF</span>
            </label>
            {fileError ? <p className="text-xs text-red-500">{fileError}</p> : null}
          </div>

          <div className="flex items-center gap-3 text-xs text-gray-400">
            <span className="flex-1 h-px bg-gray-200" />
            或者
            <span className="flex-1 h-px bg-gray-200" />
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <Link2 size={16} />
              粘贴 YouTube 链接
            </div>
            <input
              type="url"
              placeholder="https://www.youtube.com/watch?v=..."
              value={url}
              onChange={(event) => handleUrlChange(event.target.value)}
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
            {urlError ? <p className="text-xs text-red-500">{urlError}</p> : null}
          </div>

          {error ? <p className="text-sm text-red-500">{error}</p> : null}
          {status ? <p className="text-sm text-green-600">{status}</p> : null}
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800"
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit || isSubmitting}
            className="px-4 py-2 text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? '提交中...' : '提交'}
          </button>
        </div>
      </div>
    </div>
  );
}
