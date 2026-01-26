import { Bell, BookOpen } from 'lucide-react';

export default function NavBar() {
  return (
    <header className="flex-shrink-0 h-16 flex items-center justify-between px-6 bg-[#F0F2F5]">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-sm">
          <BookOpen size={20} />
        </div>
        <span className="text-xl font-bold text-gray-800 tracking-tight">MemWrite</span>
        <span className="ml-2 px-2 py-0.5 text-[10px] font-semibold bg-blue-100 text-blue-700 rounded-full uppercase tracking-wider">
          MVP
        </span>
      </div>

      <div className="flex items-center gap-4">
        <button className="text-gray-500 hover:text-gray-700 transition-colors relative">
          <Bell size={20} />
          <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full border-2 border-[#F0F2F5]"></span>
        </button>

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
}
