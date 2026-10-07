import { useState, useRef, useEffect } from "react";
import { SendHorizonal, Paperclip, File, X, Image as ImageIcon } from "lucide-react";

export function ChatInput({ onSend }: { onSend: (text: string) => void }) {
  const [input, setInput] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + "px";
    }
  }, [input]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() && selectedFiles.length === 0) return;
    
    // TODO: Send files to Storage first if selectedFiles is present
    
    if (input.trim()) {
      onSend(input.trim());
    }
    
    setInput("");
    setSelectedFiles([]);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleFileClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setSelectedFiles(prev => [...prev, ...newFiles]);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removeFile = (indexToRemove: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== indexToRemove));
  };

  return (
    <div className="bg-white border-t border-slate-200 p-4 md:px-8 md:py-6 shadow-[0_-4px_10px_-5px_rgba(0,0,0,0.05)] z-10">
      
      <div className="max-w-4xl mx-auto relative">
        {selectedFiles.length > 0 && (
          <div className="mb-3 flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
            {selectedFiles.map((file, idx) => {
              const isImage = file.type.startsWith('image/');
              return (
                <div key={idx} className="shrink-0 w-48 p-2 bg-blue-50 border border-blue-100 rounded-xl flex items-center gap-2">
                  <div className="p-1.5 bg-blue-100 text-blue-600 rounded-lg shrink-0">
                    {isImage ? <ImageIcon size={18} /> : <File size={18} />}
                  </div>
                  <div 
                    className="flex-1 min-w-0 flex flex-col justify-center cursor-pointer group"
                    onClick={() => {
                      const url = URL.createObjectURL(file);
                      window.open(url, '_blank');
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

        <form 
          onSubmit={handleSubmit} 
          className="flex items-end gap-3 bg-slate-50 rounded-3xl border border-slate-200 p-2 pl-4 focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition-all shadow-inner"
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
            className="mb-1 p-3 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors flex items-center justify-center shrink-0"
          >
            <Paperclip size={20} />
          </button>

          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
            placeholder="Type your response... (Press Enter to send)"
            className="flex-1 max-h-[120px] bg-transparent border-none focus:ring-0 resize-none py-3 px-2 text-slate-700 font-medium placeholder:text-slate-400 focus:outline-none"
            rows={1}
          />
          
          <button 
            type="submit" 
            disabled={!input.trim() && selectedFiles.length === 0}
            className="mb-1 p-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600 transition-all shadow-md flex items-center justify-center shrink-0"
          >
            <SendHorizonal size={20} className={input.trim() || selectedFiles.length > 0 ? "translate-x-0.5" : ""} />
          </button>
        </form>
      </div>
    </div>
  );
}
