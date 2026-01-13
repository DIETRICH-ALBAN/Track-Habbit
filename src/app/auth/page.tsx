"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import AuthModal from "@/components/AuthModal";
import { createClient } from "@/lib/supabase";

export default function AuthPage() {
    const router = useRouter();
    const supabase = createClient();

    useEffect(() => {
        const checkUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                router.push("/");
            }
        };
        checkUser();
    }, [router, supabase]);

    return (
        <div className="min-h-screen bg-[var(--bg-primary)]">
            <AuthModal onSuccess={() => router.push("/")} />
        </div>
    );
}
