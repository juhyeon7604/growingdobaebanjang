"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { SaveData, WeaponRow, WeaponState, fetchSheetData, saveUserData } from "../../lib/sheets";
import { DEFAULT_STORAGE_KEY, getUserStorageKey } from "../../lib/storage";

export default function StorePage() {
  const [weapons, setWeapons] = useState<WeaponRow[]>([]);
  const [money, setMoney] = useState(0);
  const [weaponState, setWeaponState] = useState<WeaponState>({ owned: [], equipped: "" });
  const [hasLoaded, setHasLoaded] = useState(false);
  const [userId] = useState<string | null>(() =>
    typeof window !== "undefined" ? localStorage.getItem("dobae_user_id") : null
  );
  const storageKey = getUserStorageKey(userId) || DEFAULT_STORAGE_KEY;

  useEffect(() => {
    let mounted = true;
    fetchSheetData()
      .then((data) => {
        if (!mounted) return;
        setWeapons(data.weapon.filter((row) => row.weaponname));
      })
      .catch(() => {
        if (!mounted) return;
        setWeapons([]);
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) {
        setHasLoaded(true);
        return;
      }
      const parsed = JSON.parse(raw) as SaveData;
      if (typeof parsed.money === "number") setMoney(parsed.money);
      if (typeof parsed.weapon === "string") {
        const next = parseWeaponState(parsed.weapon);
        setWeaponState(next);
      }
    } catch {
      // ignore
    }
    setHasLoaded(true);
  }, [storageKey]);

  useEffect(() => {
    if (!hasLoaded) return;
    const raw = localStorage.getItem(storageKey);
    const parsed = raw ? (JSON.parse(raw) as SaveData) : { money: 0, owned: [], storageSlots: 1 };
    const next: SaveData = { ...parsed, money, weapon: JSON.stringify(weaponState) };
    localStorage.setItem(storageKey, JSON.stringify(next));

    if (!userId) return;
    const timeoutId = window.setTimeout(() => {
      saveUserData(userId, next).catch(() => {
        // ignore
      });
    }, 400);

    return () => window.clearTimeout(timeoutId);
  }, [hasLoaded, money, storageKey, userId, weaponState]);

  const handleBuy = (weapon: WeaponRow) => {
    if (weaponState.owned.includes(weapon.weaponname)) return;
    if (!canBuyWeapon(weapon.weaponname)) return;
    if (money < weapon.price) return;
    const ok = window.confirm(`구매하시겠습니까?\n${weapon.weaponname} (${weapon.price.toLocaleString("ko-KR")}원)`);
    if (!ok) return;
    setMoney((prev) => prev - weapon.price);
    setWeaponState((prev) => ({
      owned: [...prev.owned, weapon.weaponname],
      equipped: prev.equipped || weapon.weaponname,
    }));
  };

  const canBuyWeapon = (weaponName: string) => {
    const index = weapons.findIndex((item) => item.weaponname === weaponName);
    if (index <= 0) return true;
    const prev = weapons[index - 1];
    if (!prev) return true;
    return weaponState.owned.includes(prev.weaponname);
  };

  const weaponSlots = useMemo(() => {
    if (weapons.length) return weapons.slice(0, 5);
    return Array.from({ length: 5 }, () => null);
  }, [weapons]);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-5xl px-4 py-10">
        <div className="rounded-2xl bg-slate-900 p-6">
          <div className="grid gap-6 lg:grid-cols-[1fr,2fr]">
            <div className="flex items-start justify-center overflow-visible">
              <div className="relative rounded-2xl border border-slate-800 bg-slate-950/60 overflow-visible">
                <div className="absolute -left-52 top-4">
                  <div className="relative max-w-none whitespace-nowrap rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-lg">
                    허허허... 어서오게나 얼른 골라봐
                    <div className="absolute -right-2 top-6 h-4 w-4 rotate-45 border-b border-r border-slate-200 bg-white" />
                  </div>
                </div>
                <Image
                  src="/storemanager.png"
                  alt="상점 매니저"
                  width={640}
                  height={900}
                  className="h-auto w-full max-w-[320px] object-cover"
                  priority
                />
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-extrabold">🛒 상점</h1>
                  <p className="mt-2 text-sm text-slate-300">
                    장비와 아이템을 구매할 수 있어.
                  </p>
                </div>
                <a
                  href="/"
                  className="rounded-xl bg-slate-800 px-4 py-2 text-sm font-semibold hover:bg-slate-700"
                >
                  홈으로
                </a>
              </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-sm">
                <div>
                  보유 머니: <span className="font-semibold">{money.toLocaleString("ko-KR")}원</span>
                </div>
                <div className="text-xs text-slate-400">
                  보유 무기: <span className="font-semibold text-slate-100">{weaponState.owned.length ? weaponState.owned.join(", ") : "없음"}</span>
                </div>
              </div>

              <div className="mt-6">
                <div className="text-sm font-semibold text-slate-200">작업 장비</div>
                <div className="mt-3 grid gap-4 sm:grid-cols-2">
                  {weaponSlots.map((weapon, idx) => (
                    <div
                      key={`equip-${idx}`}
                      className="rounded-2xl border border-slate-800 bg-slate-950/40 p-5"
                    >
                      {weapon ? (
                        <>
                          {weapon.png && (
                            <div className="mb-3 overflow-hidden rounded-xl border border-slate-800 bg-white/70">
                              <Image
                                src={getWeaponImageSrc(weapon.png)}
                                alt={weapon.weaponname}
                                width={640}
                                height={360}
                                className="h-48 w-full object-contain"
                              />
                            </div>
                          )}
                          <div className="text-sm text-slate-400">판매 중</div>
                          <div className="mt-1 text-lg font-semibold">{weapon.weaponname}</div>
                          <p className="mt-2 text-sm text-slate-300">
                            작업력 X{weapon.skill}
                          </p>
                          <div className="mt-4 flex items-center justify-between gap-2">
                            <div className="text-sm font-semibold">
                              {weapon.price.toLocaleString("ko-KR")}원
                            </div>
                            <button
                              type="button"
                              onClick={() => handleBuy(weapon)}
                              disabled={
                                money < weapon.price ||
                                weaponState.owned.includes(weapon.weaponname) ||
                                !canBuyWeapon(weapon.weaponname)
                              }
                              className="rounded-2xl bg-slate-800 px-6 py-3 text-sm font-semibold text-slate-100 hover:bg-slate-700 disabled:opacity-50"
                            >
                              {weaponState.owned.includes(weapon.weaponname)
                                ? "보유"
                                : !canBuyWeapon(weapon.weaponname)
                                  ? "이전 필요"
                                  : "구매"}
                            </button>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="text-sm text-slate-400">준비 중</div>
                          <div className="mt-1 text-lg font-semibold">작업 장비 {idx + 1}</div>
                          <p className="mt-2 text-sm text-slate-300">
                            작업 속도 향상 아이템이 추가될 예정이야.
                          </p>
                          <button
                            type="button"
                            disabled
                            className="mt-4 w-full rounded-xl bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-300 opacity-50"
                          >
                            곧 오픈
                          </button>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </main>
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
