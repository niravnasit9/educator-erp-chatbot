"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { LogIn, ShieldCheck, Building2, AlertCircle, UserPlus, Eye, EyeOff } from "lucide-react";
import { auth, db } from "@/lib/firebase";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";

export default function LoginPage() {
  const router = useRouter();
  const [isLoginMode, setIsLoginMode] = useState(true);
  
  const [userName, setUserName] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && localStorage.getItem("chatUser")) {
      router.push("/chat");
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userName.trim() || !password.trim()) return;
    
    setLoading(true);
    setError("");

    // Firebase Auth requires an email. We generate a synthetic one behind the scenes.
    const syntheticEmail = `${userName.trim().toLowerCase().replace(/\s+/g, '.')}@support.nextgenerp.com`;

    try {
      if (isLoginMode) {
        // --- FIREBASE SIGN IN ---
        const userCredential = await signInWithEmailAndPassword(auth, syntheticEmail, password);
        
        // Fetch their details from Firestore 'support_agents' collection
        const agentDoc = await getDoc(doc(db, "support_agents", userCredential.user.uid));
        
        if (agentDoc.exists()) {
          const data = agentDoc.data();
          localStorage.setItem("chatUser", JSON.stringify({
            userId: userCredential.user.uid,
            userName: data.userName,
            teamName: "Support Team" // Hardcoded since we removed dynamic teams
          }));
          window.location.href = "/chat";
        } else {
          setError("Agent record missing from database.");
          setLoading(false);
        }
        
      } else {
        // --- FIREBASE REGISTER ---
        const userCredential = await createUserWithEmailAndPassword(auth, syntheticEmail, password);
        
        // Save to 'support_agents' collection
        await setDoc(doc(db, "support_agents", userCredential.user.uid), {
          userName: userName.trim(),
          email: syntheticEmail,
          role: "support_agent",
          createdAt: new Date()
        });

        localStorage.setItem("chatUser", JSON.stringify({
          userId: userCredential.user.uid,
          userName: userName.trim(),
          teamName: "Support Team"
        }));
        window.location.href = "/chat";
      }
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password') {
        setError("Incorrect name or password.");
      } else if (err.code === 'auth/email-already-in-use') {
        setError("This agent name already exists! Switch to 'Sign In'.");
      } else if (err.code === 'auth/weak-password') {
        setError("Password should be at least 6 characters.");
      } else {
        setError(err.message || "An unexpected error occurred.");
      }
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-slate-50 font-sans">
      <div className="hidden lg:flex flex-col justify-between w-5/12 bg-slate-900 text-white p-12 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full opacity-20 pointer-events-none" style={{ backgroundImage: "radial-gradient(circle at 15% 50%, rgba(99, 102, 241, 0.4), transparent 50%), radial-gradient(circle at 85% 30%, rgba(168, 85, 247, 0.4), transparent 50%)" }}></div>
        
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-500 rounded-lg flex items-center justify-center">
            <Building2 className="text-white" size={20} />
          </div>
          <span className="text-xl font-bold tracking-tight">Educator ERP 1.0</span>
        </div>

        <div className="relative z-10">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight leading-tight mb-6">
            Intelligent Support<br />Command Center
          </h1>
          <p className="text-slate-400 text-lg max-w-md">
            Seamlessly manage client inquiries, monitor AI interactions, and provide real-time assistance from a single workspace.
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-2 text-sm text-slate-500">
          <ShieldCheck size={16} />
          <span>True Firebase Auth Active</span>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md">
          <div className="text-center mb-8 lg:text-left">
            <h2 className="text-3xl font-bold text-slate-900 mb-2">
              {isLoginMode ? "Welcome Back" : "Create Account"}
            </h2>
            <p className="text-slate-500">
              {isLoginMode ? "Log in to your agent workspace" : "Register a new agent profile"}
            </p>
          </div>

          <div className="flex bg-slate-100 p-1 rounded-xl mb-8">
            <button
              onClick={() => { setIsLoginMode(true); setError(""); }}
              className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all ${isLoginMode ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
            >
              Sign In
            </button>
            <button
              onClick={() => { setIsLoginMode(false); setError(""); }}
              className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all ${!isLoginMode ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
            >
              Register
            </button>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-lg flex items-start gap-3 text-red-700">
              <AlertCircle size={20} className="shrink-0 mt-0.5" />
              <p className="text-sm font-medium">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Agent Name</label>
              <input 
                type="text" 
                required
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="e.g. Michael"
                className="w-full px-4 py-3 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-900"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Password</label>
              <div className="relative">
                <input 
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-4 pr-12 py-3 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-900"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            
            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold py-3.5 px-4 rounded-lg shadow-sm transition-all flex items-center justify-center gap-2 mt-6 disabled:opacity-70"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : isLoginMode ? (
                <><LogIn size={18} /> Sign In</>
              ) : (
                <><UserPlus size={18} /> Create Account</>
              )}
            </button>
          </form>
          
          <div className="mt-8 text-center text-sm text-slate-400">
            Internal Portal • Educator ERP 1.0 Solutions © 2026
          </div>
        </div>
      </div>
    </div>
  );
}