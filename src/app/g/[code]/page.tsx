import { RoomScreen } from "@/components/game/room-screen";

export default async function Page({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return <RoomScreen code={code.toUpperCase()} />;
}
