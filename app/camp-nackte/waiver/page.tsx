import { CampNackteWaiverForm } from "./WaiverForm";

export default async function CampNackteWaiverPage({ searchParams }: { searchParams: Promise<{ confirmation?: string }> }) {
  const { confirmation } = await searchParams;
  return <CampNackteWaiverForm initialConfirmation={confirmation || ""} />;
}
