"use client";

import Image from "next/image";
import Link from "next/link";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { DEFAULT_STORAGE_KEY, getUserStorageKey } from "../../lib/storage";
import { WeaponState, fetchSheetData } from "../../lib/sheets";

function WorkContent() {
  const STORAGE_KEY = useMemo(() => {
    if (typeof window === "undefined") return DEFAULT_STORAGE_KEY;
    const userId = localStorage.getItem("dobae_user_id");
    return getUserStorageKey(userId) || DEFAULT_STORAGE_KEY;
  }, []);
  const router = useRouter();
  const searchParams = useSearchParams();
  const place = searchParams.get("place") ?? "서울";
  const work = Number(searchParams.get("work") ?? "0");
  const [totalWorkPower, setTotalWorkPower] = useState(0);
  const roomType = useMemo<"dirty" | "normal" | "good">(() => {
    const roll = Math.random();
    if (roll < 0.2) return "dirty";
    if (roll < 0.8) return "normal";
    return "good";
  }, []);
  const adjustedWork =
    roomType === "dirty"
      ? Math.floor((work * 1.3) / 100) * 100
      : roomType === "good"
      ? Math.floor((work * 0.7) / 100) * 100
      : work;
  const roomImage =
    roomType === "dirty" ? "/dirtyroom.png" : roomType === "good" ? "/goodroom.png" : "/oldroom.png";
  const roomLabel =
    roomType === "dirty" ? "개썩은 방 (20%)" : roomType === "good" ? "좋은 방 (20%)" : "일반 방 (60%)";
  const roomDesc =
    roomType === "dirty"
      ? "벽지 뜯어 보니 현장 상태가 최악이라 작업량이 30% 증가합니다. 보상은 그대로입니다."
      : roomType === "good"
      ? "현장 상태가 좋아 작업량이 30% 감소합니다. 보상은 그대로입니다."
      : "작업량 변동 없음. 보상은 정상입니다.";
  const laborPay = Math.floor(work / 100) * 300_000;
  const [isWorking, setIsWorking] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [workSeconds, setWorkSeconds] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [hasPaid, setHasPaid] = useState(false);
  const [penaltyText, setPenaltyText] = useState<string | null>(null);
  const [weaponMultiplier, setWeaponMultiplier] = useState(1);
  const [weaponName, setWeaponName] = useState("");
  const [weaponImage, setWeaponImage] = useState("");
  const [weaponReady, setWeaponReady] = useState(false);
  const videoSrc = "/work.mp4";

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { owned?: Array<{ workPower?: number }>; weapon?: string };
      const sum = Array.isArray(parsed.owned)
        ? parsed.owned.reduce((acc, cur) => acc + (Number(cur.workPower) || 0), 0)
        : 0;
      setTotalWorkPower(Math.max(0, sum));
      if (typeof parsed.weapon === "string") {
        const weaponState = parseWeaponState(parsed.weapon);
        setWeaponName(weaponState.equipped || "");
      }
    } catch {
      setTotalWorkPower(0);
    }
  }, [STORAGE_KEY]);

  useEffect(() => {
    if (!weaponName) {
      setWeaponMultiplier(1);
      setWeaponReady(true);
      return;
    }

    setWeaponReady(false);
    let mounted = true;
    fetchSheetData()
      .then((data) => {
        if (!mounted) return;
        const weapon = data.weapon.find((row) => row.weaponname === weaponName);
        setWeaponMultiplier(weapon?.skill ? Number(weapon.skill) : 1);
        setWeaponImage(weapon?.png ? getWeaponImageSrc(weapon.png) : "");
        setWeaponReady(true);
      })
      .catch(() => {
        if (!mounted) return;
        setWeaponMultiplier(1);
        setWeaponImage("");
        setWeaponReady(true);
      });

    return () => {
      mounted = false;
    };
  }, [weaponName]);

  const effectiveWorkPower = Math.max(1, Math.round(totalWorkPower * weaponMultiplier));

  useEffect(() => {
    if (!isWorking || workSeconds <= 0) return;

    const endAt = Date.now() + workSeconds * 1000;
    setSecondsLeft(workSeconds);

    const intervalId = window.setInterval(() => {
      const remaining = Math.max(0, Math.ceil((endAt - Date.now()) / 1000));
      setSecondsLeft(remaining);
    }, 250);

    const timeoutId = window.setTimeout(() => {
      setIsWorking(false);
      setIsDone(true);
      setSecondsLeft(0);
    }, workSeconds * 1000);

    return () => {
      window.clearInterval(intervalId);
      window.clearTimeout(timeoutId);
    };
  }, [isWorking, workSeconds]);

  useEffect(() => {
    if (!isDone || hasPaid) return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { money?: number };
      const nextMoney = (typeof parsed.money === "number" ? parsed.money : 0) + laborPay;
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...parsed, money: nextMoney }));
      setHasPaid(true);
    } catch {
      // ignore
    }
  }, [isDone, hasPaid, laborPay]);

  const handleDema = () => {
    const penalty = Math.floor(laborPay / 2);
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { money?: number };
      const nextMoney = (typeof parsed.money === "number" ? parsed.money : 0) - penalty;
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...parsed, money: nextMoney }));
    } catch {
      // ignore
    }
    setPenaltyText(`-${penalty.toLocaleString("ko-KR")}원`);
    window.setTimeout(() => setPenaltyText(null), 1200);
    router.push(`/map/${encodeURIComponent(place)}`);
  };

  const handleStartWork = useCallback(() => {
    if (isDone) return;
    if (!weaponReady) return;
    const effectivePower = Math.max(1, effectiveWorkPower);
    const seconds = Math.max(1, Math.ceil(adjustedWork / effectivePower));
    setWorkSeconds(seconds);
    setSecondsLeft(seconds);
    setIsDone(false);
    setHasPaid(false);
    setIsWorking(true);
  }, [adjustedWork, effectiveWorkPower, isDone, weaponReady]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code === "Backspace") {
        event.preventDefault();
        router.push(`/map/${encodeURIComponent(place)}`);
        return;
      }
      if (event.code !== "Space") return;
      event.preventDefault();
      if (isWorking || isDone || !weaponReady) return;
      handleStartWork();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleStartWork, isDone, isWorking, place, router, weaponReady]);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-5xl px-4 py-10">
        <div className="rounded-2xl bg-slate-900 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-extrabold"> 작업 진행</h1>
              <p className="mt-2 text-sm text-slate-300">
                {place} · 작업량 {adjustedWork.toLocaleString("ko-KR")}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {isDone ? (
                <>
                  <Link
                    href={`/map/${encodeURIComponent(place)}`}
                    className="rounded-xl bg-slate-800 px-3 py-1 text-sm font-semibold text-slate-100 hover:bg-slate-700"
                  >
                    맵으로
                  </Link>
                  <Link
                    href="/"
                    className="rounded-xl bg-slate-800 px-3 py-1 text-sm font-semibold text-slate-100 hover:bg-slate-700"
                  >
                    정비하기
                  </Link>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={handleDema}
                    className="rounded-xl bg-slate-800 px-3 py-1 text-sm font-semibold text-slate-100 hover:bg-slate-700"
                  >
                    대마
                  </button>
                  <button
                    type="button"
                    onClick={handleStartWork}
                    disabled={isWorking || !weaponReady}
                    className="rounded-xl bg-blue-600 px-3 py-1 text-sm font-semibold text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-slate-700"
                  >
                    {isWorking ? "작업 중" : !weaponReady ? "무기 적용 중" : "작업하기"}
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-[2fr,1fr]">
            <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/40">
              {penaltyText && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div className="penalty-float text-2xl font-extrabold text-rose-300">
                    {penaltyText}
                  </div>
                </div>
              )}
              {isWorking ? (
                <video
                  src={videoSrc}
                  className="h-[320px] w-full object-contain"
                  autoPlay
                  muted
                  loop
                  playsInline
                  controls
                />
              ) : isDone ? (
                <div className="flex h-[320px] w-full flex-col items-center justify-center gap-3">
                  <Image
                    src="/goodroom.png"
                    alt="작업 완료"
                    width={800}
                    height={480}
                    className="h-[240px] w-auto object-contain"
                    priority
                  />
                  <div className="text-base font-semibold text-emerald-300">작업이 끝났습니다!</div>
                </div>
              ) : (
                <Image
                  src={roomImage}
                  alt={roomLabel}
                  width={1000}
                  height={600}
                  className="h-[320px] w-full object-contain"
                  priority
                />
              )}
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-6 text-sm text-slate-300">
              <div className="text-base font-semibold text-slate-100">
                {roomLabel}
              </div>
              <p className="mt-2">
                {roomDesc}
              </p>
              <div className="mt-4 text-sm text-slate-400">
                총 작업력: {effectiveWorkPower.toLocaleString("ko-KR")} · 예상 시간: {workSeconds || Math.max(1, Math.ceil(adjustedWork / effectiveWorkPower))}초
              </div>
              <div className="mt-4 text-sm text-slate-400">
                기본 작업량: {work.toLocaleString("ko-KR")}
              </div>
              {isWorking && (
                <div className="mt-2 text-sm text-slate-300">
                  남은 시간: {secondsLeft.toLocaleString("ko-KR")}초
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-950/40 px-6 py-4 text-sm">
            <div className="text-slate-400">
              기본 작업량: <span className="font-semibold text-slate-100">{work.toLocaleString("ko-KR")}</span>
            </div>
            <div className="text-slate-400">
              인건비: <span className="font-semibold text-emerald-300">{laborPay.toLocaleString("ko-KR")}</span>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-center rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
            <img
              src="/keyboard.png"
              alt="키보드 안내"
              className="w-full max-w-[48rem] rounded-xl object-contain"
            />
          </div>
        </div>
      </div>
    </main>
  );
}

export default function WorkPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-slate-950 text-slate-100">
          <div className="mx-auto max-w-5xl px-4 py-10">
            <div className="rounded-2xl bg-slate-900 p-6">
              <div className="text-sm text-slate-300">로딩 중...</div>
            </div>
          </div>
        </main>
      }
    >
      <WorkContent />
    </Suspense>
  );
}

function getWeaponImageSrc(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return trimmed.endsWith(".png") ? `/${trimmed}` : `/${trimmed}.png`;
}

function parseWeaponState(raw: string): WeaponState {
  if (!raw) return { owned: [], equipped: "" };
  try {
    const parsed = JSON.parse(raw) as WeaponState;
    if (Array.isArray(parsed.owned)) {
      return {
        owned: parsed.owned.map((item) => String(item)),
        equipped: parsed.equipped ? String(parsed.equipped) : "",
      };
    }
  } catch {
    // ignore
  }

  return { owned: [raw], equipped: raw };
}
