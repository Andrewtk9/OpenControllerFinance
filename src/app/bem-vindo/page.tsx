"use client";

import { useRouter } from "next/navigation";
import { WelcomeScreen } from "@/components/welcome-screen";

export default function BemVindoPage() {
  const router = useRouter();
  return <WelcomeScreen onDone={() => router.replace("/")} />;
}
