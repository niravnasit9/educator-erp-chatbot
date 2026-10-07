import { MessageSquare } from "lucide-react";

export default function ChatHome() {
  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 flex flex-col items-center justify-center p-8">
      <div className="w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center mb-6 text-slate-400">
        <MessageSquare size={32} />
      </div>
      <h1 className="text-2xl font-bold text-slate-800 mb-2">
        Educator ERP 1.0 Support
      </h1>
      <p className="text-slate-500 font-medium text-center max-w-sm">
        Select a client conversation from the sidebar to start providing support.
      </p>
    </div>
  );
}
