"use client";
import { useEffect, useState } from "react";
import { db } from "@/lib/firebase/client";
import { doc, getDoc } from "firebase/firestore";

export default function FirestoreProbe() {
  const [status, setStatus] = useState("checking…");

  useEffect(() => {
    (async () => {
      try {
        // this can be any path; existence doesn't matter for connectivity
        const snap = await getDoc(doc(db, "_healthcheck", "ping"));
        setStatus(snap.exists() ? "online ✅ (doc exists)" : "online ✅ (no doc)");
      } catch (e: any) {
        setStatus("error: " + (e?.message || "unknown"));
        console.error("FirestoreProbe error:", e);
      }
    })();
  }, []);

  return <div className="text-xs opacity-70">Firestore: {status}</div>;
}
