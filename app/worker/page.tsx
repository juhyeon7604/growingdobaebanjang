"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { SaveData, WeaponRow, WeaponState, fetchSheetData, saveUserData } from "../../lib/sheets";
import { DEFAULT_STORAGE_KEY, getUserStorageKey } from "../../lib/storage";

type Rarity = "COMMON" | "RARE" | "EPIC" | "LEGENDARY" | "MYTHIC";

type OwnedCharacter = {
  uid: string;
  defId: string;
  name: string;
  rarity: Rarity;
  workPower: number;
  obtainedAt: number;
};

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
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

function normalizeGrade(value: string): Rarity {
  const grade = value.trim().toUpperCase();
  if (grade === "A" || value.includes("반장")) return "MYTHIC";
  if (grade === "B" || value.includes("기공")) return "LEGENDARY";
  if (grade === "C" || value.includes("준기공")) return "EPIC";
  if (grade === "D" || value.includes("도모")) return "RARE";
  if (value.includes("알바")) return "COMMON";
  return "RARE";
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

function getWeaponImageSrc(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return trimmed.endsWith(".png") ? `/${trimmed}` : `/${trimmed}.png`;
}

export default function WorkerPage() {
  const [owned, setOwned] = useState<OwnedCharacter[]>([]);
  const [storageSlots, setStorageSlots] = useState<number>(1);
  const [money, setMoney] = useState<number>(0);
  const [weaponState, setWeaponState] = useState<WeaponState>({ owned: [], equipped: "" });
  const [weaponRows, setWeaponRows] = useState<WeaponRow[]>([]);
  const [hasLoaded, setHasLoaded] = useState<boolean>(false);
  const [userId] = useState<string | null>(() =>
    typeof window !== "undefined" ? localStorage.getItem("dobae_user_id") : null
  );
  const storageKey = getUserStorageKey(userId) || DEFAULT_STORAGE_KEY;

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) {
        setHasLoaded(true);
        return;
      }
      const parsed = JSON.parse(raw) as SaveData;
      if (Array.isArray(parsed.owned)) setOwned(parsed.owned);
      if (typeof parsed.storageSlots === "number") setStorageSlots(clamp(parsed.storageSlots, 1, 3));
      if (typeof parsed.money === "number") setMoney(parsed.money);
      if (typeof parsed.weapon === "string") setWeaponState(parseWeaponState(parsed.weapon));
    } catch {
      // ignore
    }
    setHasLoaded(true);
  }, [storageKey]);

  useEffect(() => {
    if (!hasLoaded) return;
    const data: SaveData = { money, owned, storageSlots, weapon: JSON.stringify(weaponState) };
    localStorage.setItem(storageKey, JSON.stringify(data));

    if (!userId) return;
    const timeoutId = window.setTimeout(() => {
      saveUserData(userId, data).catch(() => {
        // ignore
      });
    }, 400);

    return () => window.clearTimeout(timeoutId);
  }, [money, owned, storageSlots, weaponState, hasLoaded, storageKey, userId]);

  useEffect(() => {
    let mounted = true;
    fetchSheetData()
      .then((data) => {
        if (!mounted) return;
        if (!data.worker.length) return;
        setWeaponRows(data.weapon.filter((row) => row.weaponname));
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
      })
      .catch(() => {
        if (!mounted) return;
      });
    return () => {
      mounted = false;
    };
  }, []);

  const baseWorkPower = owned.reduce((acc, cur) => acc + (Number(cur.workPower) || 0), 0);
  const equippedWeapon = weaponRows.find((row) => row.weaponname === weaponState.equipped);
  const weaponMultiplier = equippedWeapon?.skill ? Number(equippedWeapon.skill) : 1;
  const totalWorkPower = Math.max(1, Math.round(baseWorkPower * weaponMultiplier));
  const equippedWeaponImage = equippedWeapon?.png ? getWeaponImageSrc(equippedWeapon.png) : "";

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-5xl px-4 py-10">
        <div className="rounded-2xl bg-slate-900 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-extrabold">📦 반장 정보</h1>

            </div>
            <Link
              href="/"
              className="rounded-xl bg-slate-800 px-4 py-2 text-sm font-semibold hover:bg-slate-700"
            >
              메인으로
            </Link>
          </div>

          <div className="mt-4 rounded-xl bg-slate-950/60 p-4 text-sm text-slate-300">
            현재 슬롯 <span className="font-semibold text-slate-100">{storageSlots}/3</span> 사용 가능.
            뽑으면 최신 캐릭터가 앞 슬롯부터 채워짐
          </div>

          <div className="mt-3 rounded-xl border border-slate-800 bg-slate-950/40 p-4 text-sm text-slate-300">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                기본 작업력 합계: <span className="font-semibold text-slate-100">{baseWorkPower.toLocaleString("ko-KR")}</span>
              </div>
              <div>
                보유 무기: <span className="font-semibold text-slate-100">{weaponState.equipped || "없음"}</span>
                <span className="ml-2 text-xs text-slate-400">X {weaponMultiplier}</span>
              </div>
            </div>
            <div className="mt-2 text-sm text-slate-700">
              총 합계 작업력: <span className="font-semibold text-slate-100">{totalWorkPower.toLocaleString("ko-KR")}</span>
            </div>
          </div>

          <div className="mt-3 rounded-xl border border-slate-800 bg-slate-950/40 p-4 text-sm text-slate-300">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="font-semibold">보유 무기</div>
              <div className="text-xs text-slate-400">
                현재 장착: <span className="font-semibold text-slate-100">{weaponState.equipped || "없음"}</span>
              </div>
            </div>
            {weaponState.owned.length ? (
              <div className="mt-2">
                <select
                  value={weaponState.equipped}
                  onChange={(event) =>
                    setWeaponState((prev) => ({
                      ...prev,
                      equipped: event.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-slate-500 focus:outline-none"
                >
                  {weaponState.owned.map((weapon) => (
                    <option key={weapon} value={weapon}>
                      {weapon}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="mt-2 text-xs text-slate-400">현재 보유한 무기가 없어.</div>
            )}
          </div>

          <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950/40 p-4">
            <div className="text-sm font-semibold text-slate-200">현재 상태</div>
            <div className="mt-3 flex justify-center">
              <div className="relative">
                <img
                  src="/dobaebanjang.png"
                  alt="도배반장"
                  className="h-auto w-[320px] object-contain"
                />
                {equippedWeaponImage && (
                  <Image
                    src={equippedWeaponImage}
                    alt="장착 무기"
                    width={220}
                    height={220}
                    className="absolute left-10 top-12 z-10 h-24 w-24 -rotate-12 object-contain"
                  />
                )}
              </div>
            </div>
          </div>

          <div className="mt-4 max-h-[520px] overflow-auto rounded-xl border border-slate-800">
            <ul className="divide-y divide-slate-800">
              {Array.from({ length: 3 }).map((_, idx) => {
                const isUnlocked = idx < storageSlots;
                const c = owned[idx];

                return (
                  <li key={idx} className="p-4">
                    {!isUnlocked ? (
                      <div className="rounded-xl bg-slate-950/50 p-4">
                        <div className="flex items-center justify-between">
                          <div className="font-semibold text-slate-300">슬롯 {idx + 1}</div>
                          <span className="rounded-full bg-slate-800 px-2 py-1 text-xs text-slate-200">
                            잠김
                          </span>
                        </div>
                        <div className="mt-2 text-xs text-slate-400">
                          자물쇠를 열면 사용 가능.
                        </div>
                      </div>
                    ) : c ? (
                      <div className="rounded-xl bg-slate-950/50 p-4">
                        <div className="flex items-center justify-between gap-4">
                          <div className="text-lg font-extrabold">{c.name}</div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              className="rounded-xl bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-100 hover:bg-slate-700"
                            >
                              반장 정보
                            </button>
                            <span
                              className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold ${rarityBadgeClass(
                                c.rarity
                              )}`}
                            >
                              {rarityLabel(c.rarity)}
                            </span>
                          </div>
                        </div>

                        <div className="mt-2 flex flex-wrap gap-3 text-sm text-slate-300">
                          <span>
                            작업력 <span className="font-semibold text-slate-100">{c.workPower}</span>
                          </span>
                          <span className="text-xs text-slate-500">
                            획득: {new Date(c.obtainedAt).toLocaleString("ko-KR")}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-xl bg-slate-950/50 p-4">
                        <div className="flex items-center justify-between">
                          <div className="font-semibold text-slate-300">슬롯 {idx + 1}</div>
                          <span className="rounded-full bg-emerald-900/40 px-2 py-1 text-xs text-emerald-200">
                            비어 있음
                          </span>
                        </div>
                        <div className="mt-2 text-xs text-slate-400">
                          뽑기로 채워질 수 있어.
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>
    </main>
  );
}
