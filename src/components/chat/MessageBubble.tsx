import { Bot, User, Headphones, Trash } from "lucide-react";
import { cn } from "@/lib/utils";

export type Message = {
  id: string;
  text: string;
  sender: "user" | "system" | "ai";
  senderName: string;
  timestamp: Date;
};

export function MessageBubble({ message, showAvatar = true, onDelete }: { message: Message; showAvatar?: boolean; onDelete?: () => void }) {
  const isClient = message.sender === "user";
  const isAI = message.senderName === "AI Assistant";
  const isTeam = message.sender === "system" && !isAI;

  const timeString = message.timestamp.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className={cn("flex w-full mb-2 group", isClient ? "justify-start" : "justify-end", showAvatar ? "mt-4" : "")}>
      <div className={cn("flex max-w-[75%] items-end gap-3", isClient ? "flex-row" : "flex-row-reverse")}>
        
        {/* Avatar Icon */}
        <div className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm border border-slate-100",
          !showAvatar && "invisible",
          isClient && "bg-slate-100 text-slate-500",
          isAI && "bg-indigo-100 text-indigo-600",
          isTeam && "bg-blue-600 text-white shadow-blue-200"
        )}>
          {isClient && <User size={16} />}
          {isAI && <Bot size={16} />}
          {isTeam && <Headphones size={16} />}
        </div>

        {/* Chat Bubble */}
        <div className={cn(
          "flex flex-col relative group-hover:shadow-md transition-shadow duration-200",
          isClient 
            ? "bg-white border border-slate-200 text-slate-800 rounded-2xl rounded-bl-sm shadow-sm"
            : isAI 
              ? "bg-indigo-50 border border-indigo-100 text-indigo-900 rounded-2xl rounded-br-sm" 
              : "bg-blue-600 text-white rounded-2xl rounded-br-sm shadow-sm"
        )}>
          <div className="px-5 py-3">
            {/* Sender Name Label */}
            {showAvatar && (
              <span className={cn(
                "text-[11px] font-bold mb-1 tracking-wide block",
                isClient ? "text-slate-500" : isAI ? "text-indigo-600" : "text-blue-100"
              )}>
                {isClient ? message.senderName || "Client" : isAI ? "AI Assistant" : "Support Team"}
              </span>
            )}
            
            <p className={cn(
              "text-[14.5px] leading-relaxed font-medium whitespace-pre-wrap",
              isClient ? "text-slate-700" : isAI ? "text-indigo-900" : "text-white"
            )}>
              {message.text}
            </p>
          </div>
          
          {/* Timestamp */}
          <div className={cn(
            "px-4 pb-2 flex items-center justify-between gap-4",
            isClient ? "text-slate-400" : isAI ? "text-indigo-400" : "text-blue-200"
          )}>
            {onDelete ? (
              <button 
                onClick={onDelete}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:text-rose-500 rounded flex items-center shrink-0"
                title="Delete Message"
              >
                <Trash size={12} />
              </button>
            ) : (
              <div></div>
            )}
            <span className="text-[10px] font-semibold tracking-wider uppercase ml-auto shrink-0">
              {timeString}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
