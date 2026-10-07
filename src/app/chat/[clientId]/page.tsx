"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { MessageBubble, type Message } from "@/components/chat/MessageBubble";
import { ChatInput } from "@/components/chat/ChatInput";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, query, orderBy, serverTimestamp, doc, setDoc, deleteDoc, increment, getDocs } from "firebase/firestore";
import { CheckCircle2, Trash2, ShieldCheck, Building2, ArrowLeft } from "lucide-react";

export default function ClientChatPage({ params }: { params: Promise<{ clientId: string }> }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const clientId = resolvedParams.clientId; 
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [user, setUser] = useState<{userName: string, teamName: string} | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("chatUser");
    if (stored) setUser(JSON.parse(stored));
  }, []);

  useEffect(() => {
    if (!clientId) return;
    
    // Reset unread count since support team just opened it
    setDoc(doc(db, "ai_support_sessions", clientId), { unreadBySupport: 0 }, { merge: true }).catch(console.error);

    const q = query(collection(db, "ai_support_sessions", clientId, "messages"), orderBy("timestamp", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          text: data.text || "",
          sender: data.sender || "user",
          senderName: data.senderName || "",
          timestamp: data.timestamp?.toDate() || new Date(),
        } as Message;
      });
      setMessages(msgs);
    });
    return () => unsubscribe();
  }, [clientId]);

  const handleSendMessage = async (text: string) => {
    if (!user) return;
    try {
      const sanitizedName = user.userName.replace(/[^a-zA-Z0-9]/g, '_');
      const msgDocId = `${sanitizedName}_${Date.now()}`;
      
      await setDoc(doc(db, "ai_support_sessions", clientId, "messages", msgDocId), {
        text: text,
        sender: "system", 
        senderName: user.userName,
        timestamp: serverTimestamp()
      });
      
      // 3. Trigger Push Notification to Flutter App
      try {
        await fetch('/api/send-notification', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clientId: clientId,
            title: "Support Team Replied",
            body: text
          })
        });
      } catch (err) {
        console.error("Failed to trigger push notification", err);
      }

      await setDoc(doc(db, "ai_support_sessions", clientId), { 
        status: 'active',
        lastMessageText: text,
        lastMessageTime: serverTimestamp(),
        unreadByClient: increment(1) }, { merge: true });
    } catch (e) {
      console.error(e);
    }
  };


  const handleDeleteMessage = async (msgId: string) => {
    if (window.confirm("Are you sure you want to delete this message?")) {
      try {
        await deleteDoc(doc(db, "ai_support_sessions", clientId, "messages", msgId));
      } catch (e) {
        console.error("Error deleting message:", e);
      }
    }
  };

  const markResolved = async () => {
    try {
      
      // 3. Trigger Push Notification to Flutter App
      try {
        await fetch('/api/send-notification', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clientId: clientId,
            title: "Support Team Replied",
            body: text
          })
        });
      } catch (err) {
        console.error("Failed to trigger push notification", err);
      }

      await setDoc(doc(db, "ai_support_sessions", clientId), { status: 'resolved' }, { merge: true });
      alert("Ticket marked as resolved!");
    } catch (e) {
      console.error(e);
    }
  };

  const deleteSession = async () => {
    const confirmDelete = window.confirm("Are you sure you want to permanently delete this chat session? This action cannot be undone.");
    if (!confirmDelete) return;

    try {
      // 1. Delete all messages in the subcollection first
      const msgsRef = collection(db, "ai_support_sessions", clientId, "messages");
      const snapshot = await getDocs(msgsRef);
      const deletePromises = snapshot.docs.map(messageDoc => deleteDoc(doc(db, "ai_support_sessions", clientId, "messages", messageDoc.id)));
      await Promise.all(deletePromises);

      // 2. Delete the parent session document
      await deleteDoc(doc(db, "ai_support_sessions", clientId));
      
      alert("Session fully deleted successfully.");
      router.push("/chat");
    } catch (e) {
      console.error("Error deleting session:", e);
      alert("Failed to delete session.");
    }
  };

if (!user) return null;

  return (
    <>
      <header className="bg-white border-b border-slate-200 px-8 py-5 flex items-center justify-between shadow-sm sticky top-0 z-20">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => router.push("/chat")}
            className="md:hidden mr-2 p-2 -ml-3 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            title="Back to Dashboard"
          >
            <ArrowLeft size={20} />
          </button>
          
          <Link href="/chat" className="hidden md:flex items-center justify-center mr-2 p-2 -ml-4 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <div className="w-12 h-12 bg-slate-100 border border-slate-200 rounded-xl flex items-center justify-center text-slate-500 shadow-sm">
            <Building2 size={24} />
          </div>
          <div>
            <h1 className="font-extrabold text-xl text-slate-900 tracking-tight flex items-center gap-2">
              {clientId.replace(/_/g, ' ')}
            </h1>
            <div className="flex items-center gap-2 text-xs text-slate-500 font-medium mt-1">
              <span className="flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                <ShieldCheck size={12} /> Secure channel
              </span>
              <span>•</span>
              <span>Replying as <span className="font-bold text-slate-700">{user.userName}</span></span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={markResolved}
            className="flex items-center gap-2 bg-emerald-600 text-white hover:bg-emerald-700 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm shadow-emerald-200"
          >
            <CheckCircle2 size={18} />
            Resolve Ticket
          </button>
          
          <button 
            onClick={deleteSession}
            className="flex items-center gap-2 bg-white text-rose-600 border border-rose-200 hover:bg-rose-50 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm"
            title="Delete Session"
          >
            <Trash2 size={18} />
            <span className="hidden md:inline">Delete</span>
          </button>
        </div>
      </header>

      <main className="flex-1 min-h-0 overflow-y-auto p-4 md:p-8 bg-slate-50 flex flex-col">
        <div className="w-full max-w-4xl mx-auto flex flex-col min-h-full pb-4">
          <div className="flex-1"></div>
          {messages.length === 0 ? (
            <div className="text-center mt-32 text-slate-400 font-medium flex flex-col items-center">
              <div className="w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center mb-4 animate-pulse">
                <Building2 size={24} className="text-slate-400" />
              </div>
              Loading session data...
            </div>
          ) : (
            (() => {
// Format Date function
const formatDateChip = (date) => {
  const now = new Date();
  const aDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  
  if (aDate.getTime() === today.getTime()) return "Today";
  if (aDate.getTime() === yesterday.getTime()) return "Yesterday";
  return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
};

const groupedMessages = {};
messages.forEach(msg => {
  const dateStr = msg.timestamp.toDateString();
  if (!groupedMessages[dateStr]) groupedMessages[dateStr] = [];
  groupedMessages[dateStr].push(msg);
});

return Object.entries(groupedMessages).map(([dateStr, msgs]) => (
  <div key={dateStr} className="flex flex-col relative pb-2">
    <div className="sticky top-4 z-10 flex justify-center mb-6 mt-2">
      <span className="bg-white/95 backdrop-blur shadow-sm border border-slate-200 text-slate-500 font-bold text-[11px] uppercase tracking-wider py-1.5 px-4 rounded-full">
        {formatDateChip(msgs[0].timestamp)}
      </span>
    </div>
    {msgs.map((msg, idx) => {
      const prevMsg = idx > 0 ? msgs[idx - 1] : null;
      const showAvatar = !prevMsg || prevMsg.sender !== msg.sender || prevMsg.senderName !== msg.senderName;
      return <MessageBubble key={msg.id} message={msg} showAvatar={showAvatar} onDelete={() => handleDeleteMessage(msg.id)} />;
    })}
  </div>
));
})()
          )}
        </div>
      </main>
      <ChatInput onSend={handleSendMessage} />
    </>
  );
}
