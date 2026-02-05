import { NextResponse } from "next/server";

const SHEET_API_URL =
  "https://script.google.com/macros/s/AKfycbyRMdWsGJxctsdoDgWEdKN44bAPEHji7rkv-FpLmZHuMbuBX5z6jCZmjrRVloEIRk_S/exec";

export async function GET() {
  const response = await fetch(SHEET_API_URL, { cache: "no-store" });
  const data = await response.text();
  return new NextResponse(data, {
    status: response.status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function POST(request: Request) {
  const body = await request.text();
  const response = await fetch(SHEET_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });
  const data = await response.text();
  return new NextResponse(data, {
    status: response.status,
    headers: { "Content-Type": "application/json" },
  });
}
