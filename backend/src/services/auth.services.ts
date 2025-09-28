import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL as string,
  process.env.SUPABASE_ANON_KEY as string
);

export const loginService = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw new Error(error.message);
  return data;
};

export const verifyTokenService = async (token: string) => {
  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user) throw new Error("Token inválido ou expirado");
  return data.user;
};
