import { supabase } from "@/lib/supabase";

type EventRow = {
  id: string;
  name: string;
  event_date: string | null;
  city: string | null;
  status: string;
  organizations: { name: string }[] | { name: string } | null;
};

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

  const events = (data || []) as EventRow[];

  return events.map((event) => {
    const organization = Array.isArray(event.organizations)
      ? event.organizations[0]
      : event.organizations;

    return {
      id: event.id,
      name: event.name,
      event_date: event.event_date,
      city: event.city,
      status: event.status,
      organization_name: organization?.name || null,
    };
  });
}
