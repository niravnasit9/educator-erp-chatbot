import { NextResponse } from "next/server";
import { getApps, initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";

// Initialize Firebase Admin if not already initialized
if (getApps().length === 0) {
  try {
    initializeApp({
      credential: cert({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    });
  } catch (error) {
    console.error("Firebase admin initialization error", error);
  }
}

export async function POST(req: Request) {
  try {
    const { clientId, title, body } = await req.json();

    if (!clientId || !title || !body) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // 1. Get the FCM Token for this client from Firestore
    const db = getFirestore();
    const sanitizedName = clientId.replace(/[^a-zA-Z0-9]/g, '_');
    const tokenDoc = await db.collection("ai_support_sessions").doc(sanitizedName).get();

    if (!tokenDoc.exists) {
      return NextResponse.json({ error: "FCM token not found for client" }, { status: 404 });
    }

    const { fcmToken: token } = tokenDoc.data() as { fcmToken: string };

    if (!token) {
      return NextResponse.json({ error: "Client has no FCM token saved" }, { status: 400 });
    }

    // 2. Send the Push Notification
    const message = {
      notification: {
        title,
        body,
      },
      android: {
        notification: {
          color: '#5B61F5', // Nice purple theme color
          sound: 'default',
          },
      },
      token,
      data: {
        clientId: clientId,
      }
    };

    const response = await getMessaging().send(message);

    return NextResponse.json({ success: true, messageId: response });
  } catch (error: any) {
    console.error("Error sending push notification:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
