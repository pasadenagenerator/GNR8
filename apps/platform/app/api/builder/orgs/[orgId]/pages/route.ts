import { NextResponse } from "next/server";

const DECOMMISSIONED_PAYLOAD = {
  error: "BUILDER_API_DECOMMISSIONED",
  message: "This builder API has been retired.",
} as const;

function decommissionedResponse() {
  return NextResponse.json(DECOMMISSIONED_PAYLOAD, {
    status: 410,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function GET() {
  return decommissionedResponse();
}

export async function POST() {
  return decommissionedResponse();
}
