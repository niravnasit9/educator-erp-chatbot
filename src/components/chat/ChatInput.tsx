import { useState, useRef, useEffect, useMemo } from "react";
import {
  SendHorizonal,
  Paperclip,
  File,
  X,
  Image as ImageIcon,
  Zap,
  Check,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Search,
  Camera,
  RefreshCw,
  CheckCircle2,
  ShieldCheck,
  Heart,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface QuickAnswerItem {
  id: string;
  icon: any;
  label: string;
  tag: string;
  color: string;
  text: string;
}

function getQuickAnswers(recipientName?: string): QuickAnswerItem[] {
  const cleanName = recipientName?.trim();
  const nameDirect = cleanName ? `Hello ${cleanName}! ` : "Hello! ";
  const thankYouText = cleanName
    ? `Thank you ${cleanName} for contacting Educator Support! Have a great day.`
    : "Thank you for contacting Educator Support! Have a great day.";

  return [
    {
      id: "welcome",
      icon: Sparkles,
      label: "Welcome",
      tag: "Greeting",
      color: "bg-indigo-50/80 text-indigo-700 border-indigo-200 hover:bg-indigo-100 hover:border-indigo-300",
      text: `${nameDirect}How can I assist you today?`,
    },
    {
      id: "checking",
      icon: Search,
      label: "Checking Issue",
      tag: "Investigating",
      color: "bg-amber-50/80 text-amber-800 border-amber-200 hover:bg-amber-100 hover:border-amber-300",
      text: "We are currently checking this for you. Please allow us a moment.",
    },
    {
      id: "screenshot",
      icon: Camera,
      label: "Ask Screenshot",
      tag: "Details",
      color: "bg-purple-50/80 text-purple-700 border-purple-200 hover:bg-purple-100 hover:border-purple-300",
      text: "Could you please share a screenshot of the issue or error message?",
    },
    {
      id: "restart",
      icon: RefreshCw,
      label: "Restart App",
      tag: "Troubleshoot",
      color: "bg-sky-50/80 text-sky-800 border-sky-200 hover:bg-sky-100 hover:border-sky-300",
      text: "Please try restarting the application and check if the issue is resolved.",
    },
    {
      id: "resolved",
      icon: CheckCircle2,
      label: "Issue Resolved",
      tag: "Solved",
      color: "bg-emerald-50/80 text-emerald-800 border-emerald-200 hover:bg-emerald-100 hover:border-emerald-300",
      text: "This issue has been resolved. Please verify and let us know if everything is working fine.",
    },
    {
      id: "account",
      icon: ShieldCheck,
      label: "Request Details",
      tag: "Verification",
      color: "bg-slate-100/90 text-slate-800 border-slate-300 hover:bg-slate-200 hover:border-slate-400",
      text: "Could you please provide your registered user ID and details?",
    },
    {
      id: "thanks",
      icon: Heart,
      label: "Thank You",
      tag: "Closing",
      color: "bg-rose-50/80 text-rose-700 border-rose-200 hover:bg-rose-100 hover:border-rose-300",
      text: thankYouText,
    },
  ];
}

export function ChatInput({
  onSend,
  recipientName = "",
}: {
  onSend: (text: string) => void;
  recipientName?: string;
}) {
  const [input, setInput] = useState("");
  const [selectedQuickId, setSelectedQuickId] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRowRef = useRef<HTMLDivElement>(null);

  const quickAnswers = useMemo(() => getQuickAnswers(recipientName), [recipientName]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + "px";
    }
  }, [input]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() && selectedFiles.length === 0) return;

    if (input.trim()) {
      onSend(input.trim());
    }

    setInput("");
    setSelectedQuickId(null);
    setSelectedFiles([]);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleQuickAnswerClick = (item: QuickAnswerItem) => {
    if (selectedQuickId === item.id) {
      // Toggle off if already selected
      setSelectedQuickId(null);
      setInput("");
    } else {
      // Show ONLY this selected quick answer
      setSelectedQuickId(item.id);
      setInput(item.text);
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setInput(val);
    if (selectedQuickId) {
      const activeItem = quickAnswers.find((q) => q.id === selectedQuickId);
      if (activeItem && val !== activeItem.text) {
        setSelectedQuickId(null);
      }
    }
  };

  const scrollQuickAnswers = (direction: "left" | "right") => {
    if (scrollRowRef.current) {
      const distance = direction === "left" ? -220 : 220;
      scrollRowRef.current.scrollBy({ left: distance, behavior: "smooth" });
    }
  };

  const handleFileClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setSelectedFiles((prev) => [...prev, ...newFiles]);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removeFile = (indexToRemove: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== indexToRemove));
  };

  const activeQuickItem = quickAnswers.find((q) => q.id === selectedQuickId);

  return (
    <div className="w-full relative">
      {/* 1. Quick Answers Header & Showcase Carousel */}
      <div className="mb-2.5">
        <div className="flex items-center justify-between mb-1.5 px-0.5">
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded-md bg-[#5B61F5]/10 flex items-center justify-center">
              <Zap size={11} className="text-[#5B61F5] fill-[#5B61F5]" />
            </div>
            <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
              Quick Responses
            </span>
            <span className="text-[10px] font-semibold text-[#5B61F5] bg-[#5B61F5]/10 px-1.5 py-0.2 rounded-full border border-[#5B61F5]/20">
              {quickAnswers.length}
            </span>
          </div>

          {/* Carousel Navigation Arrows */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => scrollQuickAnswers("left")}
              className="w-5 h-5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer"
              title="Scroll left"
            >
              <ChevronLeft size={13} />
            </button>
            <button
              type="button"
              onClick={() => scrollQuickAnswers("right")}
              className="w-5 h-5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer"
              title="Scroll right"
            >
              <ChevronRight size={13} />
            </button>
          </div>
        </div>

        {/* Scrollable Chips Row */}
        <div
          ref={scrollRowRef}
          className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 scroll-smooth"
        >
          {quickAnswers.map((qa) => {
            const isSelected = selectedQuickId === qa.id;
            const IconComponent = qa.icon;

            return (
              <button
                key={qa.id}
                type="button"
                onClick={() => handleQuickAnswerClick(qa)}
                title={qa.text}
                className={cn(
                  "text-[12px] font-medium px-3 py-1.5 rounded-full border transition-all cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-1.5 active:scale-95 shadow-2xs group",
                  isSelected
                    ? "bg-[#5B61F5] text-white border-[#5B61F5] shadow-xs ring-2 ring-[#5B61F5]/25 font-semibold"
                    : qa.color
                )}
              >
                {isSelected ? (
                  <Check size={12} className="stroke-[2.5]" />
                ) : (
                  <IconComponent size={12} className="shrink-0 opacity-80 group-hover:opacity-100" />
                )}
                <span>{qa.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Active Quick Answer Showcase Banner */}
      {activeQuickItem && (
        <div className="mb-2 px-3 py-1.5 bg-[#5B61F5]/8 border border-[#5B61F5]/25 rounded-2xl flex items-center justify-between text-xs animate-in fade-in slide-in-from-bottom-1 duration-150">
          <div className="flex items-center gap-2 min-w-0 pr-2">
            <span className="text-[10px] font-bold text-[#5B61F5] uppercase tracking-wide shrink-0 bg-white px-2 py-0.5 rounded-full border border-[#5B61F5]/20 flex items-center gap-1 shadow-2xs">
              <Check size={10} className="stroke-[2.5]" />
              {activeQuickItem.label}
            </span>
            <span className="truncate italic text-slate-600 text-[12px]">
              "{activeQuickItem.text}"
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              setSelectedQuickId(null);
              setInput("");
            }}
            className="text-[11px] font-semibold text-slate-400 hover:text-rose-600 transition-colors shrink-0 p-1 hover:bg-rose-50 rounded-lg flex items-center gap-0.5 cursor-pointer"
            title="Clear response"
          >
            <X size={13} />
            <span className="hidden sm:inline">Clear</span>
          </button>
        </div>
      )}

      {/* 3. Selected Files Preview */}
      {selectedFiles.length > 0 && (
        <div className="mb-3 flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
          {selectedFiles.map((file, idx) => {
            const isImage = file.type.startsWith("image/");
            return (
              <div
                key={idx}
                className="shrink-0 w-48 p-2 bg-blue-50 border border-blue-100 rounded-xl flex items-center gap-2"
              >
                <div className="p-1.5 bg-blue-100 text-blue-600 rounded-lg shrink-0">
                  {isImage ? <ImageIcon size={18} /> : <File size={18} />}
                </div>
                <div
                  className="flex-1 min-w-0 flex flex-col justify-center cursor-pointer group"
                  onClick={() => {
                    const url = URL.createObjectURL(file);
                    window.open(url, "_blank");
                  }}
                  title={isImage ? "Click to preview image" : "Click to open file"}
                >
                  <div className="truncate font-medium text-xs text-slate-700 group-hover:underline">
                    {file.name}
                  </div>
                  <div className="text-[9px] text-blue-600 font-medium">
                    {isImage ? "Tap to preview" : "Tap to open file"}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removeFile(idx)}
                  className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-md transition-colors shrink-0"
                >
                  <X size={16} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* 4. Chat Input Form */}
      <form
        onSubmit={handleSubmit}
        className="flex items-end gap-2.5 bg-slate-50/90 rounded-3xl border border-slate-200/90 hover:border-slate-300 focus-within:ring-2 focus-within:ring-[#5B61F5]/20 focus-within:border-[#5B61F5] focus-within:bg-white p-2 pl-3.5 transition-all shadow-inner"
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
          multiple
        />

        <button
          type="button"
          onClick={handleFileClick}
          className="mb-1 p-2.5 text-slate-400 hover:text-[#5B61F5] hover:bg-[#5B61F5]/10 rounded-full transition-colors flex items-center justify-center shrink-0 cursor-pointer"
          title="Attach file or screenshot"
        >
          <Paperclip size={19} />
        </button>

        <textarea
          ref={textareaRef}
          value={input}
          onChange={handleInputChange}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmit(e);
            }
          }}
          placeholder="Type your response... (Press Enter to send)"
          className="flex-1 max-h-[120px] bg-transparent border-none focus:ring-0 resize-none py-2.5 px-2 text-slate-700 font-medium placeholder:text-slate-400 focus:outline-none text-[14px]"
          rows={1}
        />

        {/* Clear Button if input has text */}
        {input.trim() && (
          <button
            type="button"
            onClick={() => {
              setInput("");
              setSelectedQuickId(null);
            }}
            className="mb-2 p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200/70 rounded-full transition-colors cursor-pointer shrink-0"
            title="Clear text"
          >
            <X size={14} />
          </button>
        )}

        <button
          type="submit"
          disabled={!input.trim() && selectedFiles.length === 0}
          className="mb-1 p-3 bg-[#5B61F5] text-white rounded-full hover:bg-[#4d53e8] active:bg-[#4348d6] disabled:opacity-40 disabled:hover:bg-[#5B61F5] transition-all shadow-md flex items-center justify-center shrink-0 cursor-pointer disabled:cursor-not-allowed"
          title="Send message"
        >
          <SendHorizonal
            size={19}
            className={input.trim() || selectedFiles.length > 0 ? "translate-x-0.5" : ""}
          />
        </button>
      </form>
    </div>
  );
}
