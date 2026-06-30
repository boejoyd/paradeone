import { supabase } from "@/lib/supabase";

export async function getEvents() {
  const { data, error } = await supabase
    .from("events")
    .select(`
      id,
      name,
      event_date,
      city,
      status,
      organizations (
        name
      )
    `)
    .order("event_date", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}
