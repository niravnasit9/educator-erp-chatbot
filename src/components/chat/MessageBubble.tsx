"use client";

import { Bot, User, Headphones, Trash2, Info, Sparkles, CheckCheck, Ticket } from "lucide-react";
import { cn } from "@/lib/utils";

export type Message = {
  id: string;
  text: string;
  sender: "user" | "client" | "system" | "ai" | "assistant" | "support" | string;
  senderName: string;
  timestamp: Date;
  actionLabel?: string;
  actionRoute?: string;
};

export function MessageBubble({
  message,
  showAvatar = true,
  onDelete,
}: {
  message: Message;
  showAvatar?: boolean;
  onDelete?: () => void;
}) {
  const senderLower = (message.sender || "").toLowerCase().trim();
  const senderNameLower = (message.senderName || "").toLowerCase().trim();
  const textTrimmed = (message.text || "").trim();

  // 1. Support Specialist (Sent from Helpdesk by support agent)
  const isSupport =
    senderLower === "support" ||
    senderLower === "specialist" ||
    (senderLower !== "user" && (
      senderNameLower.includes("specialist") ||
      senderNameLower.includes("support team")
    ));

  // 2. AI Assistant (Includes Flutter "Educator Assistant", Gemini AI, Chatbot responses & auto-ticket replies)
  const isAI =
    !isSupport &&
    (senderLower === "ai" ||
      senderLower === "assistant" ||
      senderLower === "bot" ||
      senderNameLower.includes("assistant") ||
      senderNameLower.includes("educator ai") ||
      senderNameLower === "educator assistant" ||
      textTrimmed.startsWith("🎫 Support Ticket #") ||
      textTrimmed.startsWith("Support Ticket #"));

  // 3. System Announcement (Only short status updates from helpdesk like "Status Update: Specialist Nirav accepted ticket")
  const isSystem =
    !isSupport &&
    !isAI &&
    senderLower === "system" &&
    (textTrimmed.startsWith("Status Update:") || senderNameLower.includes("helpdesk"));

  // 4. Client (Everything else sent from app user)
  const isClient = !isSupport && !isAI && !isSystem;

  const timeString = message.timestamp.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  // 1. System status notices (Internal Helpdesk Status Updates Only)
  if (isSystem) {
    return (
      <div className="w-full flex justify-center my-2.5 group">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-200/90 border border-slate-300 text-slate-700 rounded-full text-[11px] font-medium shadow-2xs">
          <Info size={12} className="text-[#5B61F5] shrink-0" />
          <span className="leading-snug">{message.text}</span>
          <span className="text-[9.5px] text-slate-500 font-mono ml-1">{timeString}</span>
          {onDelete && (
            <button
              onClick={onDelete}
              className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:text-rose-600 rounded cursor-pointer ml-1"
              title="Delete Status Update"
            >
              <Trash2 size={11} />
            </button>
          )}
        </div>
      </div>
    );
  }

  // 2. Chat Bubble (Client, AI Assistant, or Support Specialist)
  return (
    <div
      className={cn(
        "flex w-full mb-3 group",
        isSupport ? "justify-end" : "justify-start",
        showAvatar ? "mt-3" : "mt-0.5"
      )}
    >
      <div
        className={cn(
          "flex max-w-[85%] md:max-w-[72%] items-end gap-2.5",
          isSupport ? "flex-row-reverse" : "flex-row"
        )}
      >
        {/* Avatar */}
        <div
          className={cn(
            "w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-xs border text-xs font-bold",
            !showAvatar && "invisible",
            isClient && "bg-emerald-50 border-emerald-200 text-emerald-700 shadow-emerald-100",
            isAI && "bg-indigo-50 border-indigo-200 text-[#5B61F5] shadow-indigo-100",
            isSupport && "bg-[#5B61F5] border-[#4d53e8] text-white shadow-indigo-200"
          )}
        >
          {isClient && <User size={15} />}
          {isAI && <Bot size={15} />}
          {isSupport && <Headphones size={15} />}
        </div>

        {/* Bubble Container */}
        <div
          className={cn(
            "flex flex-col relative rounded-2xl transition-all shadow-xs border",
            isClient && "bg-white border-slate-200 text-slate-900 rounded-bl-xs",
            isAI && "bg-gradient-to-b from-indigo-50/70 to-white border-indigo-200 text-slate-900 rounded-bl-xs shadow-indigo-50/50",
            isSupport && "bg-[#5B61F5] border-[#4e54ea] text-white rounded-br-xs shadow-[#5B61F5]/20"
          )}
        >
          {/* Header Tag inside bubble */}
          {showAvatar && (
            <div
              className={cn(
                "px-4 pt-2.5 pb-1 flex items-center gap-1.5 text-[11px] font-bold tracking-wide border-b",
                isClient && "text-emerald-700 border-slate-100",
                isAI && "text-[#5B61F5] border-indigo-100/70 bg-indigo-50/50 rounded-t-2xl",
                isSupport && "text-indigo-100 border-white/10"
              )}
            >
              {isClient && (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  <span className="truncate">{message.senderName || "Client"}</span>
                  <span className="text-[9.5px] font-semibold bg-emerald-100/80 text-emerald-800 px-1.5 py-0.2 rounded border border-emerald-200 ml-auto shrink-0">
                    Client
                  </span>
                </>
              )}
              {isAI && (
                <>
                  <Sparkles size={12} className="text-[#5B61F5] shrink-0" />
                  <span className="truncate">Educator AI Assistant</span>
                  <span className="text-[9.5px] font-bold bg-[#5B61F5]/10 text-[#5B61F5] px-1.5 py-0.2 rounded border border-[#5B61F5]/20 ml-auto shrink-0 flex items-center gap-0.5">
                    <Bot size={9.5} /> AI Assistant
                  </span>
                </>
              )}
              {isSupport && (
                <>
                  <Headphones size={11} className="text-white shrink-0" />
                  <span className="truncate">{message.senderName || "Support Specialist"}</span>
                  <span className="text-[9.5px] font-semibold bg-white/20 text-white px-1.5 py-0.2 rounded ml-auto shrink-0">
                    Support
                  </span>
                </>
              )}
            </div>
          )}

          {/* Message Text Body */}
          <div className="px-4 py-2.5">
            <p
              className={cn(
                "text-[14px] leading-relaxed whitespace-pre-wrap break-words font-normal",
                isClient && "text-slate-800",
                isAI && "text-slate-800",
                isSupport && "text-white"
              )}
            >
              {message.text}
            </p>
          </div>

          {/* Suggested Action Badge if present */}
          {message.actionLabel && (
            <div className="px-4 pb-2 pt-0.5">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#5B61F5]/10 text-[#5B61F5] text-xs font-semibold border border-[#5B61F5]/20 shadow-2xs">
                <Sparkles size={11} /> {message.actionLabel}
              </span>
            </div>
          )}

          {/* Footer: Time & Delete button */}
          <div
            className={cn(
              "px-3.5 pb-2 pt-0.5 flex items-center justify-between gap-3 text-[10px]",
              isClient && "text-slate-400",
              isAI && "text-slate-400",
              isSupport && "text-indigo-200"
            )}
          >
            {onDelete ? (
              <button
                onClick={onDelete}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:text-rose-500 rounded cursor-pointer shrink-0"
                title="Delete message"
              >
                <Trash2 size={12} />
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-1 font-mono text-[10px] ml-auto shrink-0">
              <span>{timeString}</span>
              {isSupport && <CheckCheck size={12} className="text-white/80" />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
