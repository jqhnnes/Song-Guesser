import { CreateScreen } from "@/components/game/create-screen";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ spotify?: string; name?: string }>;
}) {
  const params = await searchParams;
  return <CreateScreen spotifyStatus={params.spotify ?? ""} returnedName={params.name ?? ""} />;
}
