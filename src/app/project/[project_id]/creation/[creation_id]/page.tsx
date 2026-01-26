"use client";

import NavBar from '@/app/components/home/NavBar';
import CreationEditorPage from '@/app/components/creation/CreationEditorPage';

export default function CreationPage() {
  return (
    <div className="flex flex-col h-screen w-full bg-[#F0F2F5] text-gray-800 font-sans overflow-hidden">
      <NavBar />
      <div className="flex-1 flex overflow-hidden px-3 pb-3 gap-3">
        <CreationEditorPage />
      </div>
    </div>
  );
}
