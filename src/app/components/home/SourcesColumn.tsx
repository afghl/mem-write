import { FileText, MoreVertical, Plus, Search } from 'lucide-react';

type SourceItemProps = {
  title: string;
  date: string;
};

const SourceItem = ({ title, date }: SourceItemProps) => (
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

export default function SourcesColumn() {
  return (
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
  );
}
