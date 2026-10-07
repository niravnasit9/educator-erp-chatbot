"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { LogOut, LayoutDashboard, Settings, MessageSquare, AlertCircle, Menu, X, CheckCheck, Search } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";

type ClientSession = {
  id: string; 
  clientName: string;
  clientId: string;
  userId: string;
  status: string;
  lastMessageText?: string;
  lastMessageTime?: any;
  unreadBySupport?: number;
};

// Helper to format timestamp like WhatsApp
function formatWhatsAppTime(timestamp: any) {
  if (!timestamp) return "";
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const now = new Date();
  
  const isToday = date.getDate() === now.getDate() && date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  
  if (isToday) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.getDate() === yesterday.getDate() && date.getMonth() === yesterday.getMonth() && date.getFullYear() === yesterday.getFullYear()) {
    return "Yesterday";
  }
  
  return date.toLocaleDateString([], { day: '2-digit', month: '2-digit', year: '2-digit' });
}

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<{userName: string, teamName: string} | null>(null);
  const [sessions, setSessions] = useState<ClientSession[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("chatUser");
    if (!stored) {
      router.push("/");
    } else {
      setUser(JSON.parse(stored));
    }
  }, [router]);

  useEffect(() => {
    const q = query(collection(db, "ai_support_sessions"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      let docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as ClientSession[];
      docs = docs.filter(d => !d.id.startsWith('session_') && !d.id.startsWith('Technical_Team'));
      
      // Sort by latest message first
      docs.sort((a, b) => {
        const timeA = a.lastMessageTime?.seconds || 0;
        const timeB = b.lastMessageTime?.seconds || 0;
        return timeB - timeA;
      });
      
      setSessions(docs);
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("chatUser");
    router.push("/");
  };

  const filteredSessions = sessions.filter(s => s.id.toLowerCase().includes(searchQuery.toLowerCase()));

  if (!user) return <div className="h-screen bg-slate-50 flex items-center justify-center">Authenticating...</div>;

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans relative">
      
      {/* Mobile Menu Button */}
      <button 
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="md:hidden absolute top-4 right-4 z-50 p-2 bg-slate-900 text-white rounded-lg shadow-lg"
      >
        {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 z-30 md:hidden backdrop-blur-sm"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
      
      {/* Heavy Admin Sidebar */}
      <div className={cn(
        "bg-slate-900 text-slate-300 flex-col shadow-xl z-40 h-full absolute md:relative transition-transform duration-300 w-80 shrink-0",
        isMobileMenuOpen ? "translate-x-0 flex" : "-translate-x-full md:translate-x-0 hidden md:flex"
      )}>
        
        {/* Workspace Identity */}
        <div className="px-5 py-6 border-b border-slate-800">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-8 h-8 bg-indigo-500 rounded-md flex items-center justify-center text-white font-bold">
              E
            </div>
            <h1 className="font-bold text-white text-lg tracking-tight">Educator ERP 1.0</h1>
          </div>
          <p className="text-[10px] text-slate-500 ml-11 uppercase font-bold tracking-wider">Support Command Center</p>
        </div>

        {/* Navigation / Sessions */}
        <div className="px-5 mt-4 mb-2">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input 
              type="text" 
              placeholder="Search clients..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-800/50 border border-slate-700/50 rounded-lg py-2 pl-9 pr-3 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto pt-1 pb-4">
          <div className="flex flex-col gap-0.5">
            {filteredSessions.length === 0 && (
              <p className="px-6 text-xs text-slate-600 mt-4">No active conversations.</p>
            )}
            {filteredSessions.map(session => {
              const isActive = pathname.includes(session.id);
              const isEscalated = session.status === 'escalated';
              const unreadCount = session.unreadBySupport || 0;
              const hasUnread = unreadCount > 0 && !isActive;
              const timeString = formatWhatsAppTime(session.lastMessageTime);
              
              return (
                <Link key={session.id} href={`/chat/${session.id}`} onClick={() => setIsMobileMenuOpen(false)}>
                  <div className={cn(
                    "px-4 py-3.5 mx-2 rounded-xl flex items-start gap-3 cursor-pointer transition-all",
                    isActive ? "bg-slate-800 shadow-sm" : "hover:bg-slate-800/50"
                  )}>
                    {/* Avatar */}
                    <div className={cn(
                      "w-11 h-11 rounded-full flex items-center justify-center shrink-0 text-white font-bold text-lg",
                      isActive ? "bg-indigo-500" : (hasUnread ? "bg-emerald-500" : "bg-slate-700")
                    )}>
                      {session.id.charAt(0).toUpperCase()}
                    </div>
                    
                    <div className="flex-1 min-w-0 pt-0.5">
                      <div className="flex items-center justify-between mb-0.5">
                        <p className={cn(
                          "text-[15px] truncate pr-2",
                          hasUnread || isActive ? "font-bold text-white" : "font-medium text-slate-300"
                        )}>
                          {session.id.replace(/_/g, ' ')}
                        </p>
                        {timeString && (
                          <span className={cn(
                            "text-[11px] shrink-0 font-medium", 
                            hasUnread ? "text-emerald-400" : (isActive ? "text-slate-300" : "text-slate-500")
                          )}>
                            {timeString}
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center justify-between gap-2">
                        <p className={cn(
                          "text-[13px] truncate flex-1",
                          hasUnread ? "font-semibold text-slate-300" : "font-normal text-slate-500"
                        )}>
                          {session.lastMessageText || (isEscalated ? "Requires Attention" : "Active Session")}
                        </p>
                        
                        {hasUnread && (
                          <div className="w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center shrink-0 shadow-sm">
                            <span className="text-[10px] font-bold text-white">{unreadCount > 99 ? '99+' : unreadCount}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Agent Info (Sticky Bottom) */}
        <div className="px-5 py-4 border-t border-slate-800 bg-slate-900/90 backdrop-blur-sm flex items-center justify-between mt-auto">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 font-bold uppercase text-xs">
              {user.userName.charAt(0)}
            </div>
            <div>
              <p className="text-[13px] font-semibold text-white leading-tight">{user.userName}</p>
              <p className="text-[10px] text-slate-500 font-medium leading-tight">Support Agent</p>
            </div>
          </div>
          <button onClick={handleLogout} className="p-2 text-slate-500 hover:text-white hover:bg-slate-800 rounded-lg transition-all" title="Logout">
            <LogOut size={16} />
          </button>
        </div>

      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col bg-slate-50 relative min-w-0">
        {children}
      </div>
    </div>
  );
}
