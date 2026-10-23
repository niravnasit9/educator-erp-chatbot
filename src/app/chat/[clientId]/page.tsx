"use client";

import { useState, useEffect, useRef, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { MessageBubble, type Message } from "@/components/chat/MessageBubble";
import { ChatInput } from "@/components/chat/ChatInput";
import { cn } from "@/lib/utils";
import { db } from "@/lib/firebase";
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  doc,
  updateDoc,
  setDoc,
  deleteDoc,
  increment,
  getDocs,
  limitToLast,
} from "firebase/firestore";
import {
  CheckCircle2,
  Trash2,
  Building2,
  ArrowLeft,
  Play,
  Pause,
  RotateCcw,
  UserCheck,
  Ticket,
  User,
  Phone,
  Mail,
  Smartphone,
  GraduationCap,
  AlertCircle,
  Briefcase,
  Clock,
  Send
} from "lucide-react";

interface SessionData {
  ticketId?: string;
  clientId?: string;
  clientName?: string;
  instituteName?: string;
  partnerName?: string;
  userName?: string;
  name?: string;
  contactNumber?: string;
  contactEmail?: string;
  userId?: string;
  appCategory?: string;
  sourceApp?: string;
  status?: "generated" | "working" | "pending" | "resolved" | "active" | "escalated" | string;
  isTicket?: boolean;
  supportConnected?: boolean;
  assignedTo?: string;
  unreadBySupport?: number;
  unreadByClient?: number;
  ticketCreatedAt?: any;
  ticketResolvedAt?: any;
}

export function isRealTicket(data?: SessionData | null): boolean {
  if (!data) return false;
  if (data.ticketId && String(data.ticketId).trim() !== "") return true;
  if (data.isTicket === true) return true;
  if (data.supportConnected === true) return true;
  const s = (data.status || "").toLowerCase().trim();
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

export function getSessionTicketStatus(data?: SessionData | null): "generated" | "working" | "pending" | "resolved" | "ai_chat" {
  if (!isRealTicket(data)) return "ai_chat";
  const s = (data?.status || "").toLowerCase().trim();
  if (s === "resolved" || s === "closed") return "resolved";
  if (s === "working" || s === "in_progress") return "working";
  if (s === "pending") return "pending";
  return "generated";
}

export default function ClientChatPage({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  const router = useRouter();
  const resolvedParams = use(params);
  const sessionId = resolvedParams.clientId; // document ID in ai_support_sessions

  const [messages, setMessages] = useState<Message[]>([]);
  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [user, setUser] = useState<{ userName: string; teamName: string } | null>(null);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load user info from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("chatUser");
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch (e) {
        setUser({ userName: "Support Member", teamName: "Support Team" });
      }
    }
  }, []);

  // Listen to parent session document
  useEffect(() => {
    if (!sessionId) return;

    const sessionRef = doc(db, "ai_support_sessions", sessionId);

    // Reset unread count for support
    updateDoc(sessionRef, { unreadBySupport: 0 }).catch(() => { });

    const unsubSession = onSnapshot(sessionRef, (docSnap) => {
      if (docSnap.exists()) {
        setSessionData(docSnap.data() as SessionData);
      }
    });

    return () => unsubSession();
  }, [sessionId]);

  // Listen to messages subcollection (Limit to latest 40)
  useEffect(() => {
    if (!sessionId) return;

    const msgsQuery = query(
      collection(db, "ai_support_sessions", sessionId, "messages"),
      orderBy("timestamp", "asc"),
      limitToLast(40)
    );

    const unsubMessages = onSnapshot(msgsQuery, (snapshot) => {
      const msgs: Message[] = snapshot.docs.map((docSnap) => {
        const d = docSnap.data();
        let dateObj = new Date();
        if (d.timestamp) {
          dateObj = d.timestamp.toDate ? d.timestamp.toDate() : new Date(d.timestamp);
        }
        return {
          id: docSnap.id,
          text: d.text || "",
          sender: (d.sender as any) || "user",
          senderName: d.senderName || "",
          timestamp: dateObj,
          actionLabel: d.actionLabel,
          actionRoute: d.actionRoute,
        };
      });

      setMessages(msgs);
    });

    return () => unsubMessages();
  }, [sessionId]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const assignedMemberName = user?.userName || "Support Member";
  const hasTicket = isRealTicket(sessionData);
  const currentStatus = getSessionTicketStatus(sessionData);
  const realTicketId = sessionData?.ticketId ? sessionData.ticketId.replace(/^#/, "") : null;
  const instituteName = sessionData?.clientName || sessionData?.instituteName || sessionId.replace(/_/g, " ");
  const isMiniPartner = (sessionData?.appCategory || sessionData?.sourceApp || "").toLowerCase().includes("minipartner");

  // Rule: if we have the user name then the user name, if not then institute name
  const rawUserName = (sessionData?.userName || sessionData?.partnerName || sessionData?.name || "").trim();
  const hasRealUserName = Boolean(rawUserName && rawUserName.toLowerCase() !== "educator user" && rawUserName.toLowerCase() !== "user");
  const rawInstituteName = (sessionData?.instituteName || sessionData?.clientName || "").trim();
  const hasRealInstituteName = Boolean(rawInstituteName && rawInstituteName.toLowerCase() !== "unknown");
  
  // Display name for client bubbles & UI headings
  const clientDisplayName = hasRealUserName
    ? rawUserName
    : (rawInstituteName || sessionId.replace(/_/g, " "));

  // Greeting name for personalized messages only where it suits (never raw session IDs)
  const greetingName = hasRealUserName
    ? rawUserName
    : (hasRealInstituteName ? rawInstituteName : "");

  // 1. Manual Ticket Creation from Helpdesk
  const handleCreateTicket = async () => {
    if (!sessionId) return;
    try {
      const generatedId = "TKT-" + Math.floor(100000 + Math.random() * 900000);
      const statusText = "Ticket #" + generatedId + " generated by Support Member";

      const msgDocId = "status_gen_" + Date.now();
      await setDoc(doc(db, "ai_support_sessions", sessionId, "messages", msgDocId), {
        text: statusText,
        sender: "system",
        senderName: "Educator Helpdesk",
        actionLabel: "Status Update",
        timestamp: serverTimestamp(),
      });

      await updateDoc(doc(db, "ai_support_sessions", sessionId), {
        status: "generated",
        isTicket: true,
        supportConnected: true,
        ticketId: generatedId,
        assignedTo: assignedMemberName,
        ticketCreatedAt: serverTimestamp(),
        lastMessageText: statusText,
        lastMessageTime: serverTimestamp(),
        lastMessageSender: "system",
        lastMessageSenderName: "Educator Helpdesk",
      });

      fetch("/api/send-notification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: sessionId,
          title: "Support Ticket Raised",
          body: "Ticket #" + generatedId + " has been registered for your request.",
        }),
      }).catch(console.error);
    } catch (e) {
      console.error("Error creating ticket:", e);
    }
  };

  // 2. [▶ Accept & Start Working] (Blue Button)
  const handleAcceptTicket = async () => {
    if (!sessionId) return;
    try {
      const activeTicketId = sessionData?.ticketId || ("TKT-" + Math.floor(100000 + Math.random() * 900000));
      const statusText = "Support Member accepted ticket and started working";

      const msgDocId = "status_working_" + Date.now();
      await setDoc(doc(db, "ai_support_sessions", sessionId, "messages", msgDocId), {
        text: statusText,
        sender: "system",
        senderName: "Educator Helpdesk",
        actionLabel: "Status Update",
        timestamp: serverTimestamp(),
      });

      await updateDoc(doc(db, "ai_support_sessions", sessionId), {
        status: "working",
        isTicket: true,
        supportConnected: true,
        ticketId: activeTicketId,
        assignedTo: assignedMemberName,
        lastMessageText: statusText,
        lastMessageTime: serverTimestamp(),
        lastMessageSender: "system",
        lastMessageSenderName: "Educator Helpdesk",
      });

      fetch("/api/send-notification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: sessionId,
          title: "Support Member Assigned",
          body: "Support Member accepted your ticket and is now assisting.",
        }),
      }).catch(console.error);
    } catch (err) {
      console.error("Error accepting ticket:", err);
    }
  };

  // 3. [⏸ Mark Pending] (Amber Button)
  const handleMarkPending = async () => {
    if (!sessionId) return;
    try {
      const statusText = "Ticket #" + (realTicketId || sessionId) + " marked as Pending client review";

      const msgDocId = "status_pending_" + Date.now();
      await setDoc(doc(db, "ai_support_sessions", sessionId, "messages", msgDocId), {
        text: statusText,
        sender: "system",
        senderName: "Educator Helpdesk",
        actionLabel: "Status Update",
        timestamp: serverTimestamp(),
      });

      await updateDoc(doc(db, "ai_support_sessions", sessionId), {
        status: "pending",
        isTicket: true,
        lastMessageText: statusText,
        lastMessageTime: serverTimestamp(),
        lastMessageSender: "system",
        lastMessageSenderName: "Educator Helpdesk",
      });

      fetch("/api/send-notification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: sessionId,
          title: "Ticket Pending Review",
          body: "Ticket #" + (realTicketId || "") + " is awaiting your response.",
        }),
      }).catch(console.error);
    } catch (err) {
      console.error("Error marking pending:", err);
    }
  };

  // 4. [✓ Close Ticket] (Green Button)
  const handleCloseTicket = async () => {
    if (!sessionId) return;
    try {
      const statusText = "Ticket #" + (realTicketId || sessionId) + " Closed by Support Member";

      const msgDocId = "status_closed_" + Date.now();
      await setDoc(doc(db, "ai_support_sessions", sessionId, "messages", msgDocId), {
        text: statusText,
        sender: "system",
        senderName: "Educator Helpdesk",
        actionLabel: "Status Update",
        timestamp: serverTimestamp(),
      });

      await updateDoc(doc(db, "ai_support_sessions", sessionId), {
        status: "resolved",
        isTicket: true,
        supportConnected: false,
        ticketResolvedAt: serverTimestamp(),
        lastMessageText: statusText,
        lastMessageTime: serverTimestamp(),
        lastMessageSender: "system",
        lastMessageSenderName: "Educator Helpdesk",
      });

      fetch("/api/send-notification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: sessionId,
          title: "Ticket Resolved",
          body: "Your ticket has been closed by Support Member.",
        }),
      }).catch(console.error);
    } catch (err) {
      console.error("Error closing ticket:", err);
    }
  };

  // 5. Reopen Resolved Ticket
  const handleReopenTicket = async () => {
    if (!sessionId) return;
    try {
      const statusText = "Ticket #" + (realTicketId || sessionId) + " Reopened by Support Member";

      const msgDocId = "status_reopened_" + Date.now();
      await setDoc(doc(db, "ai_support_sessions", sessionId, "messages", msgDocId), {
        text: statusText,
        sender: "system",
        senderName: "Educator Helpdesk",
        actionLabel: "Status Update",
        timestamp: serverTimestamp(),
      });

      await updateDoc(doc(db, "ai_support_sessions", sessionId), {
        status: "working",
        isTicket: true,
        supportConnected: true,
        assignedTo: assignedMemberName,
        lastMessageText: statusText,
        lastMessageTime: serverTimestamp(),
        lastMessageSender: "system",
        lastMessageSenderName: "Educator Helpdesk",
      });
    } catch (err) {
      console.error("Error reopening ticket:", err);
    }
  };

  // 6. Send Message from Helpdesk
  const handleSendMessage = async (text: string) => {
    if (!sessionId || !text.trim() || isSending) return;
    setIsSending(true);

    try {
      const msgDocId = "support_msg_" + Date.now();

      await setDoc(doc(db, "ai_support_sessions", sessionId, "messages", msgDocId), {
        text: text.trim(),
        sender: "support",
        senderName: "Support Member",
        timestamp: serverTimestamp(),
      });

      const updates: any = {
        lastMessageText: text.trim(),
        lastMessageTime: serverTimestamp(),
        lastMessageSender: "support",
        lastMessageSenderName: "Support Member",
        unreadBySupport: 0,
        unreadByClient: increment(1),
      };

      await updateDoc(doc(db, "ai_support_sessions", sessionId), updates);

      fetch("/api/send-notification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: sessionId,
          title: "Support Member Replied",
          body: text.trim(),
        }),
      }).catch(console.error);
    } catch (err) {
      console.error("Error sending reply:", err);
    } finally {
      setIsSending(false);
    }
  };

  // 7. Delete Individual Message
  const handleDeleteMessage = async (msgId: string) => {
    if (window.confirm("Are you sure you want to delete this message?")) {
      try {
        await deleteDoc(doc(db, "ai_support_sessions", sessionId, "messages", msgId));
      } catch (e) {
        console.error("Error deleting message:", e);
      }
    }
  };

  // 8. Delete Entire Session & Subcollection
  const deleteSession = async () => {
    const confirmDelete = window.confirm(
      "Permanently delete this entire support session and all its messages? This action cannot be undone."
    );
    if (!confirmDelete) return;

    try {
      const msgsRef = collection(db, "ai_support_sessions", sessionId, "messages");
      const snap = await getDocs(msgsRef);
      const deletePromises = snap.docs.map((m) =>
        deleteDoc(doc(db, "ai_support_sessions", sessionId, "messages", m.id))
      );
      await Promise.all(deletePromises);
      await deleteDoc(doc(db, "ai_support_sessions", sessionId));
      router.push("/chat");
    } catch (e) {
      console.error("Error deleting session:", e);
    }
  };

  // Date Grouping logic
  const formatDateChip = (date: Date): string => {
    const now = new Date();
    const aDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);

    if (aDate.getTime() === today.getTime()) return "Today";
    if (aDate.getTime() === yesterday.getTime()) return "Yesterday";
    return (
      date.getDate().toString().padStart(2, "0") +
      "/" +
      (date.getMonth() + 1).toString().padStart(2, "0") +
      "/" +
      date.getFullYear()
    );
  };

  const groupedMessages: Record<string, Message[]> = {};
  messages.forEach((msg) => {
    const dateStr = formatDateChip(msg.timestamp);
    if (!groupedMessages[dateStr]) groupedMessages[dateStr] = [];
    groupedMessages[dateStr].push(msg);
  });

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-100 overflow-hidden font-sans">
      {/* 1. COMPREHENSIVE HEADER WITH CLIENT DETAILS & ACTION BUTTONS */}
      <header className="bg-white border-b border-slate-200 px-5 py-3 shadow-xs sticky top-0 z-20">
        <div className="flex items-center justify-between gap-4 flex-wrap md:flex-nowrap">
          {/* Left: Client & App Info */}
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href="/chat"
              className="p-2 -ml-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors md:hidden cursor-pointer"
              title="Back to Tickets"
            >
              <ArrowLeft size={18} />
            </Link>

            <div className="w-10 h-10 bg-[#5B61F5]/10 border border-[#5B61F5]/20 rounded-xl flex items-center justify-center text-[#5B61F5] shrink-0 shadow-xs font-bold text-sm">
              <Building2 size={22} />
            </div>

            <div className="min-w-0">
              {/* Row 1: Institute Name, App Badge, Ticket ID, Status */}
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="font-bold text-base text-slate-900 tracking-tight truncate leading-tight">
                  {instituteName}
                </h1>

                {/* Source App Badge */}
                <span
                  className={cn(
                    "text-[10px] font-bold px-2 py-0.5 rounded-md border flex items-center gap-1",
                    isMiniPartner
                      ? "bg-purple-50 text-purple-700 border-purple-200"
                      : "bg-indigo-50 text-[#5B61F5] border-indigo-200"
                  )}
                >
                  {isMiniPartner ? <Smartphone size={10} /> : <GraduationCap size={10} />}
                  {isMiniPartner ? "MiniPartner App" : "Educator App"}
                </span>

                {/* Ticket ID Tag */}
                {hasTicket && realTicketId ? (
                  <span className="font-mono font-bold text-[11px] bg-indigo-50 border border-indigo-200 text-[#5B61F5] px-2 py-0.5 rounded-md">
                    {"#" + realTicketId}
                  </span>
                ) : (
                  <span className="text-[10px] font-semibold bg-slate-100 text-slate-500 border border-slate-200 px-2 py-0.5 rounded-md">
                    AI Chatbot Mode (No Ticket)
                  </span>
                )}

                {/* Status Pill */}
                {hasTicket ? (
                  currentStatus === "generated" ? (
                    <span className="text-[10.5px] font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                      <AlertCircle size={10} /> Generated (New)
                    </span>
                  ) : currentStatus === "working" ? (
                    <span className="text-[10.5px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1">
                      <Briefcase size={10} /> In Progress
                    </span>
                  ) : currentStatus === "pending" ? (
                    <span className="text-[10.5px] font-bold px-2 py-0.5 rounded-md bg-orange-50 text-orange-700 border border-orange-200 flex items-center gap-1">
                      <Clock size={10} /> Pending Review
                    </span>
                  ) : (
                    <span className="text-[10.5px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                      <CheckCircle2 size={10} /> Closed
                    </span>
                  )
                ) : null}
              </div>

              {/* Row 2: Comprehensive Client Details */}
              <div className="flex items-center gap-2 text-xs text-slate-500 font-medium mt-1 flex-wrap">
                <span className="text-slate-400 font-mono text-[11px]">ID: {sessionData?.clientId || sessionId}</span>

                {sessionData?.partnerName && sessionData.partnerName !== "Educator User" && (
                  <>
                    <span className="opacity-40">•</span>
                    <span className="text-slate-700 font-semibold flex items-center gap-1">
                      <User size={11} className="text-slate-400" /> {sessionData.partnerName}
                    </span>
                  </>
                )}

                {sessionData?.contactNumber && (
                  <>
                    <span className="opacity-40">•</span>
                    <span className="text-slate-700 flex items-center gap-1 font-mono text-[11px]">
                      <Phone size={11} className="text-slate-400" /> {sessionData.contactNumber}
                    </span>
                  </>
                )}

                {sessionData?.contactEmail && (
                  <>
                    <span className="opacity-40">•</span>
                    <span className="text-slate-700 flex items-center gap-1 text-[11px]">
                      <Mail size={11} className="text-slate-400" /> {sessionData.contactEmail}
                    </span>
                  </>
                )}

                <span className="opacity-40">•</span>

                {/* Specialist Assignment */}
                {sessionData?.assignedTo ? (
                  <span className="text-slate-700 font-semibold flex items-center gap-1">
                    <UserCheck size={12} className="text-[#5B61F5]" /> Assigned: {sessionData.assignedTo}
                  </span>
                ) : (
                  <span className="text-amber-600 font-semibold flex items-center gap-1">
                    <AlertCircle size={11} /> Unassigned
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right: Support Specialist Action Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Button: Create Ticket (if in AI mode) */}
            {!hasTicket && (
              <button
                type="button"
                onClick={handleCreateTicket}
                className="flex items-center gap-1.5 bg-[#5B61F5] hover:bg-[#4d53e8] active:bg-[#4348d6] text-white text-xs font-semibold px-3 py-2 rounded-xl shadow-xs transition-all cursor-pointer"
                title="Convert this chat into an official Support Ticket"
              >
                <Ticket size={13} />
                <span>Create Ticket</span>
              </button>
            )}

            {/* Button: Accept & Start (if generated or unassigned) */}
            {hasTicket && currentStatus !== "working" && currentStatus !== "resolved" && (
              <button
                type="button"
                onClick={handleAcceptTicket}
                className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-semibold px-3 py-2 rounded-xl shadow-xs transition-all cursor-pointer"
                title="Assign to me and start working"
              >
                <Play size={13} className="fill-white" />
                <span>{currentStatus === "pending" ? "Resume Working" : "Accept & Start"}</span>
              </button>
            )}

            {/* Button: Mark Pending (if working) */}
            {hasTicket && currentStatus === "working" && (
              <button
                type="button"
                onClick={handleMarkPending}
                className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-slate-950 text-xs font-bold px-3 py-2 rounded-xl shadow-xs transition-all cursor-pointer"
                title="Mark ticket as pending client review"
              >
                <Pause size={13} className="fill-slate-950" />
                <span>Mark Pending</span>
              </button>
            )}

            {/* Button: Close Ticket (if active) */}
            {hasTicket && (
              currentStatus !== "resolved" ? (
                <button
                  type="button"
                  onClick={handleCloseTicket}
                  className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-semibold px-3 py-2 rounded-xl shadow-xs transition-all cursor-pointer"
                  title="Close and resolve ticket"
                >
                  <CheckCircle2 size={14} />
                  <span>Close Ticket</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleReopenTicket}
                  className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-3 py-2 rounded-xl shadow-xs transition-all cursor-pointer"
                  title="Reopen closed ticket"
                >
                  <RotateCcw size={13} />
                  <span>Reopen Ticket</span>
                </button>
              )
            )}

            {/* Delete Session Action */}
            <button
              type="button"
              onClick={deleteSession}
              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all cursor-pointer"
              title="Delete Session and Messages"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      </header>

      {/* 2. CHAT MESSAGE THREAD */}
      <main className="flex-1 min-h-0 overflow-y-auto p-4 md:px-8 md:py-6 bg-slate-100/70 flex flex-col custom-scrollbar">
        <div className="w-full max-w-4xl mx-auto flex flex-col flex-1">
          {messages.length === 0 ? (
            <div className="my-auto text-center py-20 text-slate-400">
              <Building2 size={36} className="mx-auto mb-3 opacity-30 text-[#5B61F5]" />
              <p className="text-sm font-semibold text-slate-600">No message history yet</p>
              <p className="text-xs text-slate-400 mt-1">
                Type a message below to communicate directly with {clientDisplayName}.
              </p>
            </div>
          ) : (
            Object.entries(groupedMessages).map(([dateStr, msgs]) => (
              <div key={dateStr} className="flex flex-col mb-4">
                {/* Date Chip */}
                <div className="sticky top-2 z-10 flex justify-center mb-3">
                  <span className="bg-white/90 backdrop-blur-xs border border-slate-200/90 text-slate-500 font-bold text-[11px] uppercase tracking-wider py-1 px-3.5 rounded-full shadow-xs">
                    {dateStr}
                  </span>
                </div>

                {/* Messages in this date */}
                {msgs.map((msg, idx) => {
                  const prevMsg = idx > 0 ? msgs[idx - 1] : null;
                  const showAvatar = !prevMsg || prevMsg.sender !== msg.sender || prevMsg.senderName !== msg.senderName;

                  return (
                    <MessageBubble
                      key={msg.id}
                      message={msg}
                      showAvatar={showAvatar}
                      onDelete={() => handleDeleteMessage(msg.id)}
                      clientFallbackName={clientDisplayName}
                    />
                  );
                })}
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* 3. STICKY INPUT BAR */}
      <footer className="p-3 bg-white border-t border-slate-200 shadow-xs z-10">
        <div className="max-w-4xl mx-auto">
          <ChatInput onSend={handleSendMessage} recipientName={greetingName} />
        </div>
      </footer>
    </div>
  );
}
