"use client";

import { useMemo } from 'react';
import { useParams } from 'next/navigation';
import NavBar from '@/app/components/home/NavBar';
import CreationEditorPage from '@/app/components/creation/CreationEditorPage';

export default function CreationPage() {
  const params = useParams();
  const projectId = useMemo(() => {
    const raw = params?.project_id;
    if (typeof raw === 'string') return raw;
    if (Array.isArray(raw)) return raw[0];
    return '';
  }, [params]);
  const creationId = useMemo(() => {
    const raw = params?.creation_id;
    if (typeof raw === 'string') return raw;
    if (Array.isArray(raw)) return raw[0];
    return '';
  }, [params]);

  return (
    <div className="flex flex-col h-screen w-full bg-[#F0F2F5] text-gray-800 font-sans overflow-hidden">
      <NavBar />
      <div className="flex-1 flex overflow-hidden px-3 pb-3 gap-3">
        <CreationEditorPage projectId={projectId} creationId={creationId} />
      </div>
    </div>
  );
}
