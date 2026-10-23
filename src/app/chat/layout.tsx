"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, query, doc, updateDoc } from "firebase/firestore";
import { cn } from "@/lib/utils";
import {
  Search,
  LogOut,
  Menu,
  X,
  AlertCircle,
  CheckCircle2,
  MessageSquare,
  Headphones,
  BellRing,
  Clock,
  Briefcase,
  UserCheck,
  Smartphone,
  GraduationCap,
  Layers,
  User,
  Bot,
  Settings2,
  Mail,
  Phone
} from "lucide-react";

export interface ClientSession {
  id: string; // document ID = sessionId
  ticketId?: string;
  status?: "generated" | "working" | "pending" | "resolved" | "active" | "escalated" | string;
  isTicket?: boolean;
  supportConnected?: boolean;
  assignedTo?: string;
  clientId?: string;
  clientName?: string;
  userId?: string;
  instituteName?: string;
  partnerName?: string;
  contactNumber?: string;
  contactEmail?: string;
  appCategory?: string;
  sourceApp?: string;
  lastMessageText?: string;
  lastMessageTime?: any;
  lastMessageSender?: string;
  lastMessageSenderName?: string;
  ticketCreatedAt?: any;
  ticketResolvedAt?: any;
  unreadBySupport?: number;
  unreadByClient?: number;
}

export type FilterTabType = "all" | "generated" | "working" | "pending" | "resolved";
export type AppFilterType = "all" | "minipartner" | "educator";

export function isRealTicket(session?: ClientSession | null): boolean {
  if (!session) return false;
  if (session.ticketId && String(session.ticketId).trim() !== "") return true;
  if (session.isTicket === true) return true;
  if (session.supportConnected === true) return true;
  const s = (session.status || "").toLowerCase().trim();
  return (
    s === "generated" ||
    s === "escalated" ||
    s === "working" ||
    s === "in_progress" ||
    s === "pending" ||
    s === "resolved" ||
    s === "closed"
  );
}

export function getSessionTicketStatus(session: ClientSession): "generated" | "working" | "pending" | "resolved" | "ai_chat" {
  if (!isRealTicket(session)) {
    return "ai_chat";
  }
  const s = (session.status || "").toLowerCase().trim();
  if (s === "resolved" || s === "closed") return "resolved";
  if (s === "working" || s === "in_progress") return "working";
  if (s === "pending") return "pending";
  return "generated";
}

export function getLastMessageSenderInfo(session: ClientSession): {
  role: "client" | "ai" | "support" | "system";
  label: string;
} {
  const sender = (session.lastMessageSender || "").toLowerCase().trim();
  const senderName = (session.lastMessageSenderName || "").trim();

  if (sender === "support" || sender === "specialist" || senderName.toLowerCase().includes("specialist") || senderName.toLowerCase().includes("member") || sender === "member") {
    return { role: "support", label: "Support Member" };
  }
  if (sender === "ai" || sender === "assistant" || sender === "bot") {
    return { role: "ai", label: "AI" };
  }
  if (sender === "user" || sender === "client") {
    return { role: "client", label: "Client" };
  }
  if (sender === "system") {
    return { role: "system", label: "System" };
  }

  // Heuristic fallbacks based on session state
  if ((session.unreadBySupport || 0) > 0) {
    return { role: "client", label: "Client" };
  }
  if ((session.unreadByClient || 0) > 0) {
    return { role: "support", label: "Support Member" };
  }
  if (!isRealTicket(session) && session.status === "active") {
    return { role: "ai", label: "AI" };
  }

  const text = (session.lastMessageText || "").toLowerCase();
  if (text.startsWith("status update:") || text.includes("ticket #") || text.includes("created") || text.includes("closed")) {
    return { role: "system", label: "System" };
  }

  return { role: "client", label: "Client" };
}

function formatWhatsAppTime(timestamp: any): string {
  if (!timestamp) return "";
  try {
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp.seconds * 1000 || timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } else if (diffDays === 1) {
      return "Yesterday";
    } else if (diffDays < 7) {
      return date.toLocaleDateString([], { weekday: "short" });
    }
    return date.toLocaleDateString([], { day: "numeric", month: "short" });
  } catch (e) {
    return "";
  }
}

function playEscalationAlert() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(659.25, now);
    gain1.gain.setValueAtTime(0.18, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.3);

    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(880, now + 0.12);
    gain2.gain.setValueAtTime(0.2, now + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.5);
  } catch (err) {
    // Autoplay restrictions
  }
}

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<{ userName: string; teamName: string } | null>(null);
  const [sessions, setSessions] = useState<ClientSession[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [appFilter, setAppFilter] = useState<AppFilterType>("all");
  const [filterTab, setFilterTab] = useState<FilterTabType>("all");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [hasNewAlert, setHasNewAlert] = useState(false);

  const prevGeneratedCountRef = useRef<number | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("chatUser");
    if (!stored) {
      router.push("/");
    } else {
      try {
        setUser(JSON.parse(stored));
      } catch (e) {
        setUser({ userName: "Support Member", teamName: "Support Team" });
      }
    }
  }, [router]);

  useEffect(() => {
    const q = query(collection(db, "ai_support_sessions"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      let docs = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      })) as ClientSession[];

      // Filter out internal non-session IDs if any
      docs = docs.filter((d) => !d.id.startsWith("session_") && !d.id.startsWith("Technical_Team"));

      // Sort by latest message time first
      docs.sort((a, b) => {
        const timeA = a.lastMessageTime?.seconds || (a.lastMessageTime ? new Date(a.lastMessageTime).getTime() / 1000 : 0);
        const timeB = b.lastMessageTime?.seconds || (b.lastMessageTime ? new Date(b.lastMessageTime).getTime() / 1000 : 0);
        return timeB - timeA;
      });

      // Sound notification trigger strictly for newly generated tickets that are unread
      const newUrgentCount = docs.filter((s) => {
        const isTicket = isRealTicket(s);
        const norm = getSessionTicketStatus(s);
        return isTicket && norm === "generated" && (s.unreadBySupport || 0) > 0;
      }).length;

      if (prevGeneratedCountRef.current !== null && newUrgentCount > prevGeneratedCountRef.current) {
        playEscalationAlert();
        setHasNewAlert(true);
        setTimeout(() => setHasNewAlert(false), 5000);
      }
      prevGeneratedCountRef.current = newUrgentCount;

      setSessions(docs);
    });

    return () => unsubscribe();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("chatUser");
    router.push("/");
  };

  const handleSessionClick = async (sessionId: string) => {
    setIsMobileMenuOpen(false);
    try {
      const sessionRef = doc(db, "ai_support_sessions", sessionId);
      await updateDoc(sessionRef, {
        unreadBySupport: 0,
      });
    } catch (e) {
      console.error("Failed to clear unreadBySupport:", e);
    }
  };

  // App Category Counts
  const miniPartnerTotal = useMemo(() => {
    return sessions.filter((s) => (s.appCategory || s.sourceApp || "").toLowerCase().includes("minipartner")).length;
  }, [sessions]);

  const educatorTotal = useMemo(() => {
    return sessions.filter((s) => !(s.appCategory || s.sourceApp || "").toLowerCase().includes("minipartner")).length;
  }, [sessions]);

  // Sessions filtered by Source App first
  const appFilteredSessions = useMemo(() => {
    if (appFilter === "minipartner") {
      return sessions.filter((s) => (s.appCategory || s.sourceApp || "").toLowerCase().includes("minipartner"));
    }
    if (appFilter === "educator") {
      return sessions.filter((s) => !(s.appCategory || s.sourceApp || "").toLowerCase().includes("minipartner"));
    }
    return sessions;
  }, [sessions, appFilter]);

  // Counts based on active Source App filter
  const totalUnreadCount = appFilteredSessions.reduce((acc, s) => acc + (s.unreadBySupport || 0), 0);
  const generatedCount = appFilteredSessions.filter((s) => isRealTicket(s) && getSessionTicketStatus(s) === "generated").length;
  const workingCount = appFilteredSessions.filter((s) => isRealTicket(s) && getSessionTicketStatus(s) === "working").length;
  const pendingCount = appFilteredSessions.filter((s) => isRealTicket(s) && getSessionTicketStatus(s) === "pending").length;
  const resolvedCount = appFilteredSessions.filter((s) => isRealTicket(s) && getSessionTicketStatus(s) === "resolved").length;

  // Final filtered list with Lifecycle filter and Search query
  const filteredSessions = appFilteredSessions.filter((s) => {
    const isTicket = isRealTicket(s);
    const status = getSessionTicketStatus(s);

    // 1. Lifecycle Tab filter
    if (filterTab === "generated" && (!isTicket || status !== "generated")) return false;
    if (filterTab === "working" && (!isTicket || status !== "working")) return false;
    if (filterTab === "pending" && (!isTicket || status !== "pending")) return false;
    if (filterTab === "resolved" && (!isTicket || status !== "resolved")) return false;

    // 2. Search filter
    if (!searchQuery.trim()) return true;
    const qLower = searchQuery.toLowerCase();
    const instName = (s.clientName || s.instituteName || s.id.replace(/_/g, " ")).toLowerCase();
    const pName = (s.partnerName || "").toLowerCase();
    const cId = (s.clientId || s.id).toLowerCase();
    const tId = (s.ticketId || "").toLowerCase();
    const cPhone = (s.contactNumber || "").toLowerCase();
    const cEmail = (s.contactEmail || "").toLowerCase();
    const lastSnippet = (s.lastMessageText || "").toLowerCase();

    return (
      instName.includes(qLower) ||
      pName.includes(qLower) ||
      cId.includes(qLower) ||
      tId.includes(qLower) ||
      cPhone.includes(qLower) ||
      cEmail.includes(qLower) ||
      lastSnippet.includes(qLower)
    );
  });

  if (!user) {
    return (
      <div className="h-screen bg-slate-100 flex items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <div className="w-8 h-8 border-3 border-[#5B61F5] border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-medium">Authenticating Helpdesk...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden font-sans relative">
      {/* Mobile Menu Toggle Button */}
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="md:hidden absolute top-3.5 right-4 z-50 p-2 bg-[#5B61F5] text-white rounded-xl shadow-md cursor-pointer"
        aria-label="Toggle Navigation"
      >
        {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Mobile Drawer Overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 z-30 md:hidden backdrop-blur-xs transition-opacity"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Left Sidebar */}
      <aside
        className={cn(
          "bg-slate-900 text-slate-200 flex-col shadow-2xl z-40 h-full absolute md:relative transition-all duration-300 w-88 shrink-0 flex border-r border-slate-800",
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        {/* Workspace Brand Header */}
        <div className="p-3.5 border-b border-slate-800/80 bg-slate-950/40">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 bg-[#5B61F5] rounded-xl flex items-center justify-center text-white shadow-md shadow-[#5B61F5]/25 font-bold">
                <Headphones size={20} />
              </div>
              <div>
                <h1 className="font-bold text-white text-[15px] tracking-tight leading-tight">
                  Educator Helpdesk
                </h1>
                <p className="text-[10px] text-slate-400 font-medium">Omnichannel Support Center</p>
              </div>
            </div>

            {totalUnreadCount > 0 && (
              <span className="bg-rose-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-xs animate-pulse">
                {totalUnreadCount} New
              </span>
            )}
          </div>

          {/* Visual Alert Banner for Newly Generated Tickets */}
          {hasNewAlert && (
            <div className="mt-2.5 p-2 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center gap-2 text-amber-300 text-xs animate-bounce">
              <BellRing size={14} className="shrink-0" />
              <span className="font-semibold">New Ticket Request Received!</span>
            </div>
          )}
        </div>

        {/* 1. SOURCE APP FILTER (MiniPartner vs Educator App) */}
        <div className="px-3 pt-2.5 pb-1 border-b border-slate-800/50">
          <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
            <span className="flex items-center gap-1.5">
              <Smartphone size={11} className="text-[#5B61F5]" /> Source App
            </span>
            {appFilter !== "all" && (
              <button
                onClick={() => setAppFilter("all")}
                className="text-[#5B61F5] hover:underline cursor-pointer lowercase text-[10px] font-medium"
              >
                show all
              </button>
            )}
          </div>
          <div className="grid grid-cols-3 gap-1 bg-slate-950/70 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setAppFilter("all")}
              className={cn(
                "py-1.5 text-[10.5px] font-bold rounded-lg transition-all text-center cursor-pointer flex items-center justify-center gap-1",
                appFilter === "all"
                  ? "bg-[#5B61F5] text-white shadow-xs"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
              )}
            >
              <Layers size={11} /> All ({sessions.length})
            </button>
            <button
              onClick={() => setAppFilter("minipartner")}
              className={cn(
                "py-1.5 text-[10.5px] font-bold rounded-lg transition-all text-center cursor-pointer flex items-center justify-center gap-1 truncate px-1",
                appFilter === "minipartner"
                  ? "bg-purple-600 text-white shadow-xs"
                  : "text-purple-300/80 hover:text-purple-200 hover:bg-slate-800/40"
              )}
              title="MiniPartner App"
            >
              <Smartphone size={11} /> MiniPartner ({miniPartnerTotal})
            </button>
            <button
              onClick={() => setAppFilter("educator")}
              className={cn(
                "py-1.5 text-[10.5px] font-bold rounded-lg transition-all text-center cursor-pointer flex items-center justify-center gap-1 truncate px-1",
                appFilter === "educator"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-indigo-300/80 hover:text-indigo-200 hover:bg-slate-800/40"
              )}
              title="Educator App"
            >
              <GraduationCap size={11} /> Educator ({educatorTotal})
            </button>
          </div>
        </div>

        {/* 2. SEARCH BAR */}
        <div className="px-3 pt-2 pb-1">
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search Client, Partner, Ticket #..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-800/70 border border-slate-700/60 rounded-xl py-1.5 pl-8 pr-3 text-xs text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#5B61F5]/50 focus:border-[#5B61F5] transition-all"
            />
          </div>
        </div>

        {/* 3. TICKET LIFECYCLE FILTERS (NON-SCROLLABLE SINGLE ROW) */}
        <div className="px-3 py-1.5 border-b border-slate-800/70">
          <div className="grid grid-cols-5 gap-1 bg-slate-950/70 p-1 rounded-xl border border-slate-800 select-none">
            <button
              onClick={() => setFilterTab("all")}
              className={cn(
                "py-1 px-0.5 rounded-lg text-center cursor-pointer transition-all flex flex-col items-center justify-center",
                filterTab === "all"
                  ? "bg-[#5B61F5] text-white shadow-xs font-bold"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
              )}
              title="All Sessions"
            >
              <span className="text-[10px] leading-tight block">All</span>
              <span className="text-[9.5px] opacity-80 font-mono">({appFilteredSessions.length})</span>
            </button>

            <button
              onClick={() => setFilterTab("generated")}
              className={cn(
                "py-1 px-0.5 rounded-lg text-center cursor-pointer transition-all flex flex-col items-center justify-center",
                filterTab === "generated"
                  ? "bg-amber-500 text-slate-950 shadow-xs font-bold"
                  : "text-amber-400/90 hover:text-amber-300 hover:bg-slate-800/40"
              )}
              title="New Tickets"
            >
              <span className="text-[10px] leading-tight block">New</span>
              <span className="text-[9.5px] opacity-80 font-mono">({generatedCount})</span>
            </button>

            <button
              onClick={() => setFilterTab("working")}
              className={cn(
                "py-1 px-0.5 rounded-lg text-center cursor-pointer transition-all flex flex-col items-center justify-center",
                filterTab === "working"
                  ? "bg-blue-600 text-white shadow-xs font-bold"
                  : "text-blue-400 hover:text-blue-200 hover:bg-slate-800/40"
              )}
              title="Working Tickets"
            >
              <span className="text-[10px] leading-tight block">Work</span>
              <span className="text-[9.5px] opacity-80 font-mono">({workingCount})</span>
            </button>

            <button
              onClick={() => setFilterTab("pending")}
              className={cn(
                "py-1 px-0.5 rounded-lg text-center cursor-pointer transition-all flex flex-col items-center justify-center",
                filterTab === "pending"
                  ? "bg-orange-500 text-white shadow-xs font-bold"
                  : "text-orange-400 hover:text-orange-200 hover:bg-slate-800/40"
              )}
              title="Pending Tickets"
            >
              <span className="text-[10px] leading-tight block">Pend</span>
              <span className="text-[9.5px] opacity-80 font-mono">({pendingCount})</span>
            </button>

            <button
              onClick={() => setFilterTab("resolved")}
              className={cn(
                "py-1 px-0.5 rounded-lg text-center cursor-pointer transition-all flex flex-col items-center justify-center",
                filterTab === "resolved"
                  ? "bg-emerald-600 text-white shadow-xs font-bold"
                  : "text-emerald-400 hover:text-emerald-200 hover:bg-slate-800/40"
              )}
              title="Resolved Tickets"
            >
              <span className="text-[10px] leading-tight block">Done</span>
              <span className="text-[9.5px] opacity-80 font-mono">({resolvedCount})</span>
            </button>
          </div>
        </div>

        {/* 4. REAL-TIME CLIENT SESSIONS LIST */}
        <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1.5 custom-scrollbar">
          {filteredSessions.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              <MessageSquare size={28} className="mx-auto mb-2 opacity-40" />
              <p className="text-xs font-medium">No tickets match this filter</p>
              <p className="text-[11px] text-slate-600 mt-1">Try changing app or lifecycle tab</p>
            </div>
          ) : (
            filteredSessions.map((session) => {
              const isActive = pathname.includes(session.id);
              const unreadCount = session.unreadBySupport || 0;
              const hasUnread = unreadCount > 0 && !isActive;
              const hasTicket = isRealTicket(session);
              const status = getSessionTicketStatus(session);
              const timeString = formatWhatsAppTime(session.lastMessageTime);
              const senderInfo = getLastMessageSenderInfo(session);

              const displayName = session.clientName || session.instituteName || session.id.replace(/_/g, " ");
              const displayTicketId = session.ticketId
                ? (session.ticketId.startsWith("#") ? session.ticketId : "#" + session.ticketId)
                : null;

              const isMiniPartner = (session.appCategory || session.sourceApp || "").toLowerCase().includes("minipartner");

              return (
                <Link
                  key={session.id}
                  href={"/chat/" + session.id}
                  onClick={() => handleSessionClick(session.id)}
                  className="block"
                >
                  <div
                    className={cn(
                      "p-2.5 rounded-xl transition-all cursor-pointer relative border",
                      isActive
                        ? "bg-[#5B61F5]/15 border-[#5B61F5]/40 shadow-xs"
                        : hasTicket && status === "generated"
                          ? "bg-amber-950/20 border-amber-500/30 hover:bg-slate-800/60"
                          : hasTicket && status === "working"
                            ? "bg-blue-950/20 border-blue-500/25 hover:bg-slate-800/60"
                            : hasTicket && status === "pending"
                              ? "bg-orange-950/20 border-orange-500/25 hover:bg-slate-800/60"
                              : "bg-slate-800/30 border-transparent hover:bg-slate-800/70"
                    )}
                  >
                    <div className="flex items-start gap-2.5">
                      {/* Avatar */}
                      <div
                        className={cn(
                          "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 font-bold text-xs shadow-xs",
                          !hasTicket
                            ? "bg-slate-700 text-slate-200"
                            : status === "generated"
                              ? "bg-amber-500 text-slate-950"
                              : status === "working"
                                ? "bg-blue-600 text-white"
                                : status === "pending"
                                  ? "bg-orange-500 text-white"
                                  : "bg-emerald-600 text-white"
                        )}
                      >
                        {displayName.charAt(0).toUpperCase()}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        {/* Row 1: Institute Name & Time */}
                        <div className="flex items-center justify-between mb-0.5">
                          <p
                            className={cn(
                              "text-xs truncate font-semibold leading-tight",
                              isActive || hasUnread ? "text-white" : "text-slate-200"
                            )}
                          >
                            {displayName}
                          </p>
                          {timeString && (
                            <span
                              className={cn(
                                "text-[10px] shrink-0 font-medium ml-1.5",
                                hasUnread ? "text-[#5B61F5] font-bold" : "text-slate-400"
                              )}
                            >
                              {timeString}
                            </span>
                          )}
                        </div>

                        {/* Row 2: App Badge, Ticket ID, Status Badge & Assigned */}
                        <div className="flex items-center gap-1.5 mb-1.5 text-[9.5px] flex-wrap leading-none">
                          {/* App Source Pill */}
                          <span
                            className={cn(
                              "px-1.5 py-0.5 rounded font-bold border flex items-center gap-0.5",
                              isMiniPartner
                                ? "bg-purple-900/30 text-purple-300 border-purple-500/30"
                                : "bg-indigo-900/30 text-indigo-300 border-indigo-500/30"
                            )}
                          >
                            {isMiniPartner ? <Smartphone size={8.5} /> : <GraduationCap size={8.5} />}
                            {isMiniPartner ? "MiniPartner" : "Educator App"}
                          </span>

                          {/* Ticket ID Badge (ONLY when real ticket exists!) */}
                          {displayTicketId ? (
                            <span className="font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 px-1.5 py-0.5 rounded text-[9.5px]">
                              {displayTicketId}
                            </span>
                          ) : (
                            <span className="font-medium bg-slate-800 text-slate-400 border border-slate-700 px-1.5 py-0.5 rounded text-[9px]">
                              AI Chat
                            </span>
                          )}

                          {/* Status Pill */}
                          {hasTicket ? (
                            status === "generated" ? (
                              <span className="px-1.5 py-0.5 rounded font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-0.5">
                                <AlertCircle size={8.5} /> New
                              </span>
                            ) : status === "working" ? (
                              <span className="px-1.5 py-0.5 rounded font-bold bg-blue-500/20 text-blue-300 border border-blue-500/40 flex items-center gap-0.5">
                                <Briefcase size={8.5} /> Working
                              </span>
                            ) : status === "pending" ? (
                              <span className="px-1.5 py-0.5 rounded font-bold bg-orange-500/20 text-orange-300 border border-orange-500/40 flex items-center gap-0.5">
                                <Clock size={8.5} /> Pending
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.5 rounded font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-0.5">
                                <CheckCircle2 size={8.5} /> Closed
                              </span>
                            )
                          ) : null}

                          {/* Specialist Assigned Tag */}
                          {session.assignedTo && (
                            <span className="text-slate-400 text-[9px] truncate max-w-[100px] flex items-center gap-0.5 ml-auto">
                              <UserCheck size={8.5} className="text-indigo-400" /> {session.assignedTo}
                            </span>
                          )}
                        </div>

                        {/* Row 3: Partner, Email & Contact Info */}
                        {(session.partnerName || session.contactEmail || session.contactNumber) && (
                          <div className="flex items-center gap-1.5 text-[9.5px] text-slate-400 mb-1 flex-wrap">
                            {session.partnerName && session.partnerName !== "Educator User" && (
                              <span className="flex items-center gap-0.5 truncate max-w-[110px]">
                                <User size={8.5} className="text-slate-400 shrink-0" />
                                <span className="truncate">{session.partnerName}</span>
                              </span>
                            )}
                            {session.contactEmail && (
                              <span className="flex items-center gap-0.5 truncate text-indigo-300/90 font-mono text-[9px] bg-slate-800/80 px-1 py-0.2 rounded border border-slate-700/60 max-w-[160px]">
                                <Mail size={8} className="text-indigo-400 shrink-0" />
                                <span className="truncate">{session.contactEmail}</span>
                              </span>
                            )}
                            {session.contactNumber && (
                              <span className="flex items-center gap-0.5 text-slate-400 text-[9px] font-mono">
                                <Phone size={8} className="text-slate-500 shrink-0" />
                                <span>{session.contactNumber}</span>
                              </span>
                            )}
                          </div>
                        )}

                        {/* Row 4: Last Message Sender + Snippet + Unread Badge */}
                        <div className="flex items-center justify-between gap-1.5">
                          <div className="flex items-center gap-1 min-w-0 flex-1">
                            {/* Color-coded Last Message Sender Indicator */}
                            {senderInfo.role === "client" && (
                              <span className="px-1 py-0.2 rounded text-[8.5px] font-bold bg-emerald-950/60 text-emerald-300 border border-emerald-500/30 shrink-0 flex items-center gap-0.5">
                                <User size={7.5} /> Client:
                              </span>
                            )}
                            {senderInfo.role === "ai" && (
                              <span className="px-1 py-0.2 rounded text-[8.5px] font-bold bg-indigo-950/60 text-indigo-300 border border-indigo-500/30 shrink-0 flex items-center gap-0.5">
                                <Bot size={7.5} /> AI:
                              </span>
                            )}
                            {senderInfo.role === "support" && (
                              <span className="px-1 py-0.2 rounded text-[8.5px] font-bold bg-blue-950/60 text-blue-300 border border-blue-500/30 shrink-0 flex items-center gap-0.5">
                                <Headphones size={7.5} /> Support:
                              </span>
                            )}
                            {senderInfo.role === "system" && (
                              <span className="px-1 py-0.2 rounded text-[8.5px] font-bold bg-slate-800 text-slate-300 border border-slate-700 shrink-0 flex items-center gap-0.5">
                                <Settings2 size={7.5} /> System:
                              </span>
                            )}

                            {/* Snippet text */}
                            <p
                              className={cn(
                                "text-[11px] truncate leading-none",
                                hasUnread ? "font-semibold text-slate-100" : "text-slate-400"
                              )}
                            >
                              {session.lastMessageText || "No message history"}
                            </p>
                          </div>

                          {/* Red unread counter */}
                          {hasUnread && (
                            <span className="w-4.5 h-4.5 bg-rose-500 text-white rounded-full flex items-center justify-center text-[9.5px] font-bold shrink-0 shadow-xs animate-pulse">
                              {unreadCount > 99 ? "99+" : unreadCount}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })
          )}
        </div>

        {/* 5. STICKY SPECIALIST PROFILE FOOTER */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between mt-auto">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-[#5B61F5] text-white flex items-center justify-center text-xs font-bold uppercase shrink-0 shadow-xs">
              {user.userName.charAt(0)}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-white truncate leading-tight">
                {user.userName}
              </p>
              <p className="text-[10px] text-slate-400 truncate leading-tight">{user.teamName || "Support Member"}</p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            title="Log out"
          >
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      {/* Main Content Viewport */}
      <div className="flex-1 flex flex-col bg-slate-50 relative min-w-0">
        {children}
      </div>
    </div>
  );
}
