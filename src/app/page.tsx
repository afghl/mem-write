"use client";

import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Send, 
  Sparkles, 
  FileText, 
  MessageSquare, 
  MoreVertical, 
  Share2, 
  Database,
  CheckCircle2,
  AlertCircle,
  Loader2,
  PenTool,
  BookOpen,
  Bell
} from 'lucide-react';

// --- Components (Locally defined for MVP portability) ---

const Toast = ({ message, type, visible, onClose }: { message: string, type: 'success' | 'error', visible: boolean, onClose: () => void }) => {
  if (!visible) return null;
  
  return (
    <div className={`fixed top-20 left-1/2 transform -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-3 rounded-full shadow-lg border animate-in fade-in slide-in-from-top-4 duration-300 ${
      type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'
    }`}>
      {type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
      <span className="text-sm font-medium">{message}</span>
    </div>
  );
};

const SourceItem = ({ title, date }: { title: string, date: string }) => (
  <div className="group flex items-center justify-between p-3 hover:bg-gray-100 rounded-xl cursor-pointer transition-colors">
    <div className="flex items-center gap-3 overflow-hidden">
      <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 text-red-600">
        <FileText size={16} />
      </div>
      <div className="flex flex-col overflow-hidden">
        <span className="text-sm font-medium text-gray-800 truncate">{title}</span>
        <span className="text-xs text-gray-500">{date}</span>
      </div>
    </div>
    <button className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-gray-600 transition-opacity">
      <MoreVertical size={16} />
    </button>
  </div>
);

const StudioCard = ({ title, icon, color }: { title: string, icon: React.ReactNode, color: string }) => (
  <div className="p-4 rounded-2xl border border-gray-200 bg-white hover:shadow-md transition-shadow cursor-pointer flex flex-col gap-3">
    <div className={`w-8 h-8 rounded-full ${color} flex items-center justify-center`}>
      {icon}
    </div>
    <h3 className="font-medium text-gray-800">{title}</h3>
    <div className="h-2 w-16 bg-gray-100 rounded-full mt-auto"></div>
  </div>
);

const NavBar = () => (
  <header className="flex-shrink-0 h-16 flex items-center justify-between px-6 bg-[#F0F2F5]">
    {/* Logo Area */}
    <div className="flex items-center gap-2">
      <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-sm">
        <BookOpen size={20} />
      </div>
      <span className="text-xl font-bold text-gray-800 tracking-tight">MemWrite</span>
      <span className="ml-2 px-2 py-0.5 text-[10px] font-semibold bg-blue-100 text-blue-700 rounded-full uppercase tracking-wider">MVP</span>
    </div>

    {/* Right Area: User & Actions */}
    <div className="flex items-center gap-4">
       {/* Notifications */}
      <button className="text-gray-500 hover:text-gray-700 transition-colors relative">
        <Bell size={20} />
        <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full border-2 border-[#F0F2F5]"></span>
      </button>

      {/* User Profile */}
      <div className="flex items-center gap-3 pl-4 border-l border-gray-300">
        <div className="text-right hidden sm:block">
          <div className="text-sm font-medium text-gray-800">Demo User</div>
          <div className="text-xs text-gray-500">Pro Plan</div>
        </div>
        <div className="w-9 h-9 bg-gradient-to-tr from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-medium shadow-sm ring-2 ring-white cursor-pointer hover:ring-blue-100 transition-all">
          D
        </div>
      </div>
    </div>
  </header>
);

// --- Main Page Component ---

export default function Home() {
  const [checkingHealth, setCheckingHealth] = useState(false);
  const [toast, setToast] = useState<{ visible: boolean, message: string, type: 'success' | 'error' }>({ visible: false, message: '', type: 'success' });

  // Auto-hide toast
  useEffect(() => {
    if (toast.visible) {
      const timer = setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast.visible]);

  const handleSystemCheck = async () => {
    setCheckingHealth(true);
    try {
      // Real backend call to Next.js API route
      const res = await fetch('/api/health');
      if (!res.ok) throw new Error('API failed');
      const data = await res.json();
      
      setToast({
        visible: true,
        message: `System Ready: DB ${data.postgres} | Vector ${data.vectorDB}`,
        type: 'success'
      });
    } catch (e) {
      setToast({
        visible: true,
        message: "System Check Failed: backend unreachable",
        type: 'error'
      });
    } finally {
      setCheckingHealth(false);
    }
  };

  return (
    <div className="flex flex-col h-screen w-full bg-[#F0F2F5] text-gray-800 font-sans overflow-hidden">
      
      <NavBar />
      
      <Toast visible={toast.visible} message={toast.message} type={toast.type} onClose={() => setToast(prev => ({...prev, visible: false}))} />

      {/* Main Grid Container - Responsive adjustments included */}
      <div className="flex-1 flex overflow-hidden px-3 pb-3 gap-3">
        
        {/* --- Left Column: Sources --- */}
        <div className="w-[280px] hidden md:flex flex-shrink-0 flex-col bg-white rounded-[24px] border border-gray-200/60 shadow-sm overflow-hidden">
          <div className="p-5 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-800">Sources</h2>
            <button className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-600">
              <Plus size={20} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto no-scrollbar px-3 space-y-1">
            <SourceItem title="Product Requirements.pdf" date="Just now" />
            <SourceItem title="Competitor Analysis 2024" date="2 hours ago" />
            <SourceItem title="Meeting Notes - Q3" date="Yesterday" />
            {/* Empty state placeholder could go here */}
          </div>

          <div className="p-4 border-t border-gray-100">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input 
                type="text" 
                placeholder="Search sources" 
                className="w-full bg-gray-50 border border-gray-200 rounded-full py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>
          </div>
        </div>

        {/* --- Middle Column: Chat / Interaction --- */}
        <div className="flex-1 flex flex-col bg-white rounded-[24px] border border-gray-200/60 shadow-sm overflow-hidden relative">
          
          {/* Top Right: System Check Button */}
          <div className="absolute top-4 right-4 z-10">
            <button 
              onClick={handleSystemCheck}
              disabled={checkingHealth}
              className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg text-xs font-medium text-gray-600 transition-colors"
            >
              {checkingHealth ? <Loader2 size={12} className="animate-spin" /> : <Database size={12} />}
              System Check
            </button>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 mb-6">
              <Sparkles size={32} />
            </div>
            <h1 className="text-2xl font-semibold text-gray-900 mb-2">
              Upload a source to get started
            </h1>
            <p className="text-gray-500 max-w-md mb-8">
              MemWrite helps you understand your documents. Upload a PDF, audio file, or paste text to begin chatting.
            </p>
            
            <button className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-full font-medium shadow-md transition-transform hover:scale-105 active:scale-95">
              <Plus size={18} />
              <span>Add Source</span>
            </button>
          </div>

          {/* Bottom Input Area */}
          <div className="p-6">
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-purple-500/5 rounded-3xl blur-sm opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative bg-gray-50 border border-gray-200 hover:border-gray-300 rounded-[28px] flex items-center p-2 transition-colors">
                <button className="p-3 text-gray-400 hover:text-gray-600 hover:bg-gray-200/50 rounded-full transition-colors">
                  <Plus size={20} />
                </button>
                <input 
                  type="text" 
                  placeholder="Ask anything..." 
                  className="flex-1 bg-transparent border-none focus:outline-none px-2 text-gray-800 placeholder-gray-400"
                />
                <button className="p-3 bg-white shadow-sm border border-gray-100 rounded-full text-gray-800 hover:text-blue-600 transition-colors">
                  <Send size={18} />
                </button>
              </div>
              <div className="text-center mt-3">
                 <span className="text-[10px] text-gray-400">AI can make mistakes. Check important info.</span>
              </div>
            </div>
          </div>
        </div>

        {/* --- Right Column: Studio --- */}
        <div className="w-[320px] hidden lg:flex flex-shrink-0 flex-col bg-white rounded-[24px] border border-gray-200/60 shadow-sm overflow-hidden relative">
          <div className="p-5 flex items-center justify-between border-b border-gray-50">
            <h2 className="text-xl font-semibold text-gray-800">Studio</h2>
            <button className="text-gray-400 hover:text-gray-600">
              <Share2 size={18} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto no-scrollbar p-4">
            <div className="grid grid-cols-1 gap-4">
               <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Suggested</div>
               <StudioCard 
                 title="WeChat Article" 
                 icon={<MessageSquare size={16} className="text-green-600"/>} 
                 color="bg-green-100" 
               />
               <StudioCard 
                 title="RedNote Post" 
                 icon={<FileText size={16} className="text-red-600"/>} 
                 color="bg-red-100" 
               />
               <StudioCard 
                 title="Summary" 
                 icon={<Sparkles size={16} className="text-purple-600"/>} 
                 color="bg-purple-100" 
               />
               
               <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mt-4 mb-1">Saved Notes</div>
               <div className="p-4 bg-yellow-50/50 border border-yellow-100 rounded-xl">
                  <h4 className="font-medium text-gray-800 text-sm mb-1">Key Takeaways</h4>
                  <p className="text-xs text-gray-500 line-clamp-3">
                    The primary focus of Q3 should be on user retention rather than acquisition. The data suggests...
                  </p>
               </div>
            </div>
          </div>

          {/* Floating Action Button */}
          <div className="absolute bottom-6 right-6">
            <button className="flex items-center gap-2 px-4 py-3 bg-gray-900 hover:bg-black text-white rounded-2xl shadow-lg hover:shadow-xl transition-all hover:-translate-y-1">
              <PenTool size={18} />
              <span className="font-medium text-sm">Add Note</span>
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}