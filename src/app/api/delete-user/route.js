import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const body = await request.json();
    console.log("BODY:", body);

    const { userId } = body;

    if (!userId) {
      console.log("USER ID NÃO VEIO");
      return NextResponse.json(
        { error: "userId não enviado" },
        { status: 400 },
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
    );

    const { error } = await supabase.auth.admin.deleteUser(userId);

    if (error) {
      console.log("ERRO SUPABASE:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    await supabase.from("profiles").delete().eq("id", userId);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.log("ERRO GERAL:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 400 });
  }
}
