"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { SaveData, fetchSheetData, saveUserData } from "../../lib/sheets";
import { DEFAULT_STORAGE_KEY, getUserStorageKey } from "../../lib/storage";

type Rarity = "COMMON" | "RARE" | "EPIC" | "LEGENDARY" | "MYTHIC";

type CharacterDef = {
  id: string;
  name: string;
  rarity: Rarity;
  weight: number;
  skill?: number;
};

type OwnedCharacter = {
  uid: string;
  defId: string;
  name: string;
  rarity: Rarity;
  workPower: number;
  obtainedAt: number;
};

const DEFAULT_POOL: CharacterDef[] = [
  { id: "lee1", name: "이점순", rarity: "MYTHIC", weight: 10 },
  { id: "jang1", name: "장엽자", rarity: "MYTHIC", weight: 10 },
  { id: "hong1", name: "홍줍의", rarity: "LEGENDARY", weight: 40 },
  { id: "lee2", name: "이밈희", rarity: "LEGENDARY", weight: 40 },
  { id: "im1", name: "임점순", rarity: "EPIC", weight: 70 },
  { id: "kim1", name: "김섬용", rarity: "RARE", weight: 90 },
];

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function pickWeighted(pool: CharacterDef[]) {
  const total = pool.reduce((s, p) => s + p.weight, 0);
  let r = Math.random() * total;
  for (const p of pool) {
    r -= p.weight;
    if (r <= 0) return p;
  }
  return pool[pool.length - 1];
}

function rollStats(rarity: Rarity) {
  switch (rarity) {
    case "COMMON":
      return { workPower: 10 };
    case "RARE":
      return { workPower: 20 };
    case "EPIC":
      return { workPower: 30 };
    case "LEGENDARY":
      return { workPower: 40 };
    case "MYTHIC":
      return { workPower: 50 };
  }
}

function rarityLabel(r: Rarity) {
  switch (r) {
    case "COMMON":
      return "알바";
    case "RARE":
      return "도모";
    case "EPIC":
      return "준기공";
    case "LEGENDARY":
      return "기공";
    case "MYTHIC":
      return "반장";
  }
}

function rarityBadgeClass(r: Rarity) {
  switch (r) {
    case "COMMON":
      return "bg-slate-200 text-slate-800";
    case "RARE":
      return "bg-sky-200 text-sky-900";
    case "EPIC":
      return "bg-fuchsia-200 text-fuchsia-900";
    case "LEGENDARY":
      return "bg-amber-200 text-amber-900";
    case "MYTHIC":
      return "bg-rose-200 text-rose-900";
  }
}

function formatNum(n: number) {
  return n.toLocaleString("ko-KR");
}

function makeUid() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : String(Date.now()) + "_" + String(Math.random());
}

function normalizeGrade(value: string): Rarity {
  const grade = value.trim().toUpperCase();
  if (["COMMON", "RARE", "EPIC", "LEGENDARY", "MYTHIC"].includes(grade)) {
    return grade as Rarity;
  }
  if (grade === "A" || value.includes("반장")) return "MYTHIC";
  if (grade === "B" || value.includes("기공")) return "LEGENDARY";
  if (grade === "C" || value.includes("준기공")) return "EPIC";
  if (grade === "D" || value.includes("도모")) return "RARE";
  if (value.includes("알바")) return "COMMON";
  return "RARE";
}

function gradeWeight(rarity: Rarity) {
  switch (rarity) {
    case "MYTHIC":
      return 10;
    case "LEGENDARY":
      return 40;
    case "EPIC":
      return 70;
    case "RARE":
      return 90;
    case "COMMON":
      return 120;
  }
}

function normalizeProbability(value?: number) {
  if (value == null || Number.isNaN(value)) return null;
  const normalized = value > 0 && value < 1 ? value * 100 : value;
  return Math.max(1, normalized);
}

export default function GachaPage() {
  const [money, setMoney] = useState<number>(0);
  const [owned, setOwned] = useState<OwnedCharacter[]>([]);
  const [lastPull, setLastPull] = useState<OwnedCharacter | null>(null);
  const [storageSlots, setStorageSlots] = useState<number>(1);
  const [weaponName, setWeaponName] = useState("");
  const [workerPool, setWorkerPool] = useState<CharacterDef[]>(DEFAULT_POOL);
  const [hasLoaded, setHasLoaded] = useState<boolean>(false);
  const [userId] = useState<string | null>(() =>
    typeof window !== "undefined" ? localStorage.getItem("dobae_user_id") : null
  );
  const storageKey = getUserStorageKey(userId) || DEFAULT_STORAGE_KEY;

  const pullCost = 10_000_000;
  const unlockCost = 10_000_000;

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) {
        setHasLoaded(true);
        return;
      }
      const parsed = JSON.parse(raw) as SaveData;
      if (typeof parsed.money === "number") setMoney(parsed.money);
      if (Array.isArray(parsed.owned)) setOwned(parsed.owned);
      if (typeof parsed.storageSlots === "number") setStorageSlots(clamp(parsed.storageSlots, 1, 3));
      if (typeof parsed.weapon === "string") setWeaponName(parsed.weapon);
    } catch {
      // ignore
    }
    setHasLoaded(true);
  }, [storageKey]);

  useEffect(() => {
    if (!hasLoaded) return;
    const data: SaveData = { money, owned, storageSlots, weapon: weaponName };
    localStorage.setItem(storageKey, JSON.stringify(data));

    if (!userId) return;
    const timeoutId = window.setTimeout(() => {
      saveUserData(userId, data).catch(() => {
        // ignore
      });
    }, 400);

    return () => window.clearTimeout(timeoutId);
  }, [money, owned, storageSlots, weaponName, hasLoaded, storageKey, userId]);

  useEffect(() => {
    let mounted = true;
    fetchSheetData()
      .then((data) => {
        if (!mounted) return;
        if (data.worker.length) {
          const mapped = data.worker
            .filter((row) => row.name)
            .map((row, idx) => ({
              id: `${row.name}-${idx}`,
              name: row.name,
              rarity: normalizeGrade(row.grade),
              weight: normalizeProbability(row.probability) ?? gradeWeight(normalizeGrade(row.grade)),
              skill: row.skill,
            }));
          setWorkerPool(mapped.length ? mapped : DEFAULT_POOL);

          setOwned((prev) =>
            prev.map((item) => {
              const row = data.worker.find((w) => w.name === item.name);
              if (!row) return item;
              return {
                ...item,
                rarity: normalizeGrade(row.grade),
                workPower: row.skill,
              };
            })
          );
        }
      })
      .catch(() => {
        if (!mounted) return;
        setWorkerPool(DEFAULT_POOL);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const odds = useMemo(() => {
    return [...workerPool].map((c) => ({
      ...c,
      shownPct: c.weight,
    }));
  }, [workerPool]);



  function pullCharacter() {
    if (money < pullCost) {
      alert(`돈이 부족해! (필요: ${formatNum(pullCost)}원)`);
      return;
    }

    setMoney((m) => m - pullCost);

    const picked = pickWeighted(workerPool);
    const st = picked.skill != null ? { workPower: picked.skill } : rollStats(picked.rarity);

    const newChar: OwnedCharacter = {
      uid: makeUid(),
      defId: picked.id,
      name: picked.name,
      rarity: picked.rarity,
      workPower: Math.round(clamp(st.workPower, 0, 100) * 10) / 10,
      obtainedAt: Date.now(),
    };

    setLastPull(newChar);
    setOwned((arr) => {
      const next = [newChar, ...arr];
      return next.slice(0, storageSlots);
    });
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-5xl px-4 py-10">
        <div className="rounded-2xl bg-slate-900 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-extrabold">🎰 반장 뽑기</h1>
              <p className="mt-2 text-sm text-slate-300">원하는 반장을 뽑아 성장해.</p>
            </div>
            <Link
              href="/"
              className="rounded-xl bg-slate-800 px-4 py-2 text-sm font-semibold hover:bg-slate-700"
            >
              메인으로
            </Link>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <div className="rounded-xl bg-slate-950/60 px-4 py-2 text-sm">
              보유 돈: <span className="font-semibold text-slate-100">{formatNum(money)}원</span>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-slate-300">
                1회 비용: <span className="font-semibold text-slate-100">{formatNum(pullCost)}원</span>
              </div>
              <button
                onClick={pullCharacter}
                className="rounded-xl bg-emerald-600 px-4 py-2 font-semibold hover:bg-emerald-500 disabled:opacity-40"
                disabled={money < pullCost}
              >
                뽑기
              </button>
            </div>
          </div>

          <div className="mt-6 rounded-xl bg-slate-950/60 p-4">
            <div className="text-sm text-slate-400">뽑기 결과</div>
            {lastPull ? (
              <div className="mt-2 flex items-start justify-between gap-3">
                <div>
                  <div className="text-lg font-extrabold">{lastPull.name}</div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-sm">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold ${rarityBadgeClass(
                        lastPull.rarity
                      )}`}
                    >
                      {rarityLabel(lastPull.rarity)}
                    </span>
                    <span className="text-slate-300">
                      작업력: <span className="font-semibold text-slate-100">{lastPull.workPower}</span>
                    </span>
                  </div>
                </div>
                <div className="text-xs text-slate-500">저장됨</div>
              </div>
            ) : (
              <div className="mt-2 text-slate-300">
                아직 뽑은 결과가 없어. 뽑아
              </div>
            )}
          </div>

          <div className="mt-6">
            <div className="text-sm font-semibold text-slate-200">확률표</div>
            <div className="mt-2 overflow-hidden rounded-xl border border-slate-800">
              <table className="w-full text-sm">
                <thead className="bg-slate-950/40 text-slate-300">
                  <tr>
                    <th className="px-3 py-2 text-left">캐릭터</th>
                    <th className="px-3 py-2 text-left">희귀도</th>
                    <th className="px-3 py-2 text-right">확률</th>
                  </tr>
                </thead>
                <tbody>
                  {odds.map((c, idx) => (
                    <tr
                      key={c.id}
                      className={`border-t border-slate-800 ${
                        idx % 2 === 0
                          ? 'bg-slate-200/40 dark:bg-slate-800/40'
                          : 'bg-slate-200/30 dark:bg-slate-800/30'
                      }`}
                    >
                      <td className="px-3 py-2">{c.name}</td>
                      <td className="px-3 py-2">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold ${rarityBadgeClass(
                            c.rarity
                          )}`}
                        >
                          {rarityLabel(c.rarity)}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right">{c.shownPct}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-6 rounded-xl border border-slate-800 bg-slate-950/40 p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-slate-300">
                보관함 슬롯: <span className="font-semibold text-slate-100">{storageSlots}/3</span>
              </div>
              <button
                type="button"
                disabled
                className="rounded-xl bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-300 opacity-50"
              >
                슬롯 열기 (+1) {formatNum(unlockCost)}원
              </button>
            </div>
            <div className="mt-2 text-xs text-slate-400">아직 서비스 안됨 ㅋㅋ</div>
          </div>
        </div>
      </div>
    </main>
  );
}
