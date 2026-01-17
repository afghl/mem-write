import { FileText, MessageSquare, PenTool, Share2, Sparkles } from 'lucide-react';

type StudioCardProps = {
  title: string;
  icon: React.ReactNode;
  color: string;
};

const StudioCard = ({ title, icon, color }: StudioCardProps) => (
  <div className="p-4 rounded-2xl border border-gray-200 bg-white hover:shadow-md transition-shadow cursor-pointer flex flex-col gap-3">
    <div className={`w-8 h-8 rounded-full ${color} flex items-center justify-center`}>
      {icon}
    </div>
    <h3 className="font-medium text-gray-800">{title}</h3>
    <div className="h-2 w-16 bg-gray-100 rounded-full mt-auto"></div>
  </div>
);

export default function StudioColumn() {
  return (
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
            icon={<MessageSquare size={16} className="text-green-600" />}
            color="bg-green-100"
          />
          <StudioCard
            title="RedNote Post"
            icon={<FileText size={16} className="text-red-600" />}
            color="bg-red-100"
          />
          <StudioCard
            title="Summary"
            icon={<Sparkles size={16} className="text-purple-600" />}
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
  );
}
