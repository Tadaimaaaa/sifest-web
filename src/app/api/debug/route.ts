import { NextResponse } from "next/server";
import { getEvents } from "@/lib/sifest/registrations";

export async function GET() {
  const events = await getEvents();
  return NextResponse.json(events);
}
