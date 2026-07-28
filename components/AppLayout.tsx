import { Menu, Plus, Mic, History, Crown, LogIn } from 'lucide-react'; // Assuming you use lucide-react for icons

export default function AppLayout({ children }) {
  return (
    <div className="flex h-screen bg-[#131314] text-gray-100 font-sans">
      
      {/* Sidebar */}
      <aside className="w-64 bg-[#1E1F20] flex flex-col hidden md:flex border-r border-gray-800">
        <div className="p-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold tracking-wide text-white">Vibechord</h1>
          <button className="p-2 hover:bg-gray-700 rounded-md transition-colors">
            <Menu size={20} />
          </button>
        </div>

        {/* New Chat Button */}
        <div className="px-4 pb-4">
          <button className="w-full flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-sm font-medium py-2.5 px-4 rounded-full transition-all">
            <Plus size={16} />
            New Session
          </button>
        </div>

        {/* History List */}
        <div className="flex-1 overflow-y-auto px-3 space-y-1">
          <p className="text-xs text-gray-400 font-semibold px-2 pt-2 pb-1">Recent</p>
          <button className="w-full flex items-center gap-2 text-sm text-gray-300 hover:bg-gray-800 p-2 rounded-md transition-colors truncate">
            <History size={16} className="shrink-0" />
            <span className="truncate">Lo-fi progression in C minor</span>
          </button>
          <button className="w-full flex items-center gap-2 text-sm text-gray-300 hover:bg-gray-800 p-2 rounded-md transition-colors truncate">
            <History size={16} className="shrink-0" />
            <span className="truncate">Metal rhythm guitar tabs</span>
          </button>
        </div>

        {/* Footer Actions (Auth & Premium) */}
        <div className="p-4 border-t border-gray-800 space-y-2">
          <button className="w-full flex items-center gap-3 text-sm text-amber-200 hover:bg-gray-800 p-2 rounded-md transition-colors">
            <Crown size={18} />
            Upgrade to Premium
          </button>
          <button className="w-full flex items-center gap-3 text-sm text-gray-300 hover:bg-gray-800 p-2 rounded-md transition-colors">
            <LogIn size={18} />
            Log In / Sign Up
          </button>
        </div>
      </aside>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col h-full relative">
        {/* Mobile Header (Hidden on Desktop) */}
        <header className="md:hidden flex items-center justify-between p-4 border-b border-gray-800 bg-[#1E1F20]">
           <h1 className="text-xl font-semibold text-white">Vibechord</h1>
           <Menu size={24} />
        </header>

        {children}
      </main>
    </div>
  );
}