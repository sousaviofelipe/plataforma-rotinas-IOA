import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function POST(request) {
  const { full_name, email, password, role, position, sector } =
    await request.json();

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const { error: profileError } = await supabase.from("profiles").insert({
    id: data.user.id,
    full_name,
    email,
    role,
    position,
    sector,
  });

  if (profileError) {
    return NextResponse.json(
      { error: "Usuário criado mas perfil falhou: " + profileError.message },
      { status: 400 },
    );
  }

  return NextResponse.json({ success: true });
}
