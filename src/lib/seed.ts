
import { db } from "@/lib/firebase";
import { collection, getDocs, updateDoc, doc, query, orderBy, limit } from "firebase/firestore";

export async function seedDatabase() {
  console.log("Running robust DB sync...");
  const q = collection(db, "ai_support_sessions");
  const snapshot = await getDocs(q);
  
  for (const document of snapshot.docs) {
    // Get all messages for this session
    const msgsRef = collection(db, "ai_support_sessions", document.id, "messages");
    const msgsQ = query(msgsRef, orderBy("timestamp", "desc"));
    const msgsSnap = await getDocs(msgsQ);
    
    if (!msgsSnap.empty) {
      const messages = msgsSnap.docs.map(d => d.data());
      const lastMessage = messages[0];
      
      // Calculate unread by support
      let unread = 0;
      for (const msg of messages) {
        if (msg.sender === 'user') {
          unread++;
        } else {
          break; // Stop counting when we hit a response from support or AI
        }
      }
      
      await updateDoc(doc(db, "ai_support_sessions", document.id), {
        lastMessageText: lastMessage.text || "Message",
        lastMessageTime: lastMessage.timestamp || null,
        unreadBySupport: unread
      });
      console.log("Updated", document.id, "with", unread, "unread messages");
    }
  }
  console.log("Sync complete");
}
