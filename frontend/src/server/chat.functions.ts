import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const SYSTEM_PROMPT = `You are EDITH (Enhanced Digital Intelligence & Trading Hub), an AI assistant for NSB's dual-engine business managing freelancing and dropshipping.

You help with:
- Finding freelance jobs and drafting proposals
- Discovering trending dropshipping products and validating them
- Creating invoices and tracking payments
- Reviewing earnings, ROAS, and agent performance
- Controlling agents (pause/resume), updating settings

Reply in friendly, concise markdown. When the user asks for actionable items (jobs, products, invoices), describe them clearly with bullet lists. Use mock realistic data when needed since this is a demo. Always be specific and helpful.`;

export const sendChatMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      message: z.string().min(1).max(4000),
      currentRoute: z.string().max(100).optional(),
    }).parse(input)
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // load history
    const { data: history } = await supabase
      .from("chat_messages")
      .select("role, content")
      .eq("user_id", userId)
      .order("created_at", { ascending: true })
      .limit(20);

    // save user message
    await supabase.from("chat_messages").insert({
      user_id: userId, role: "user", content: data.message,
      metadata: { route: data.currentRoute },
    });

    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) {
      const fallback = "AI gateway is not configured. Please add the LOVABLE_API_KEY secret.";
      await supabase.from("chat_messages").insert({ user_id: userId, role: "assistant", content: fallback });
      return { reply: fallback };
    }

    const messages = [
      { role: "system", content: SYSTEM_PROMPT + (data.currentRoute ? `\n\nUser is currently on the "${data.currentRoute}" page.` : "") },
      ...(history || []).map((m: any) => ({ role: m.role, content: m.content })),
      { role: "user", content: data.message },
    ];

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model: "google/gemini-2.5-flash", messages }),
    });

    if (!res.ok) {
      const errText = await res.text();
      const msg = res.status === 429
        ? "Rate limit reached. Please try again in a moment."
        : res.status === 402
        ? "AI credits exhausted. Add credits in workspace settings."
        : `AI request failed: ${errText.slice(0, 200)}`;
      await supabase.from("chat_messages").insert({ user_id: userId, role: "assistant", content: msg });
      return { reply: msg };
    }

    const json: any = await res.json();
    const reply = json.choices?.[0]?.message?.content || "I didn't get a response. Try again?";
    await supabase.from("chat_messages").insert({ user_id: userId, role: "assistant", content: reply });
    return { reply };
  });

export const getChatHistory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("chat_messages").select("*")
      .eq("user_id", context.userId).order("created_at", { ascending: true }).limit(50);
    return { messages: data || [] };
  });

export const clearChatHistory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await context.supabase.from("chat_messages").delete().eq("user_id", context.userId);
    return { ok: true };
  });