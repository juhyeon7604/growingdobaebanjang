"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { DEFAULT_STORAGE_KEY, getUserStorageKey } from "../lib/storage";
import { WeaponRow, fetchSheetData } from "../lib/sheets";

type OwnedCharacter = {
  uid: string;
  name: string;
  rarity: string;
  workPower: number;
  obtainedAt: number;
};

export default function Page() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [nickname, setNickname] = useState<string>("");
  const [money, setMoney] = useState<number>(0);
  const [owned, setOwned] = useState<OwnedCharacter[]>([]);
  const [weaponRows, setWeaponRows] = useState<WeaponRow[]>([]);
  const [equippedWeapon, setEquippedWeapon] = useState<string>("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const storedId = localStorage.getItem("dobae_user_id");
    const storedNickname = localStorage.getItem("dobae_user_nickname") ?? "";
    setUserId(storedId);
    setNickname(storedNickname);

    if (!storedId) return;
    const storageKey = getUserStorageKey(storedId) || DEFAULT_STORAGE_KEY;
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { money?: number; owned?: OwnedCharacter[]; weapon?: string };
      if (typeof parsed.money === "number") setMoney(parsed.money);
      if (Array.isArray(parsed.owned)) setOwned(parsed.owned);
      if (typeof parsed.weapon === "string") {
        const weaponState = parseWeaponState(parsed.weapon);
        setEquippedWeapon(weaponState.equipped || "");
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    fetchSheetData()
      .then((data) => {
        if (!mounted) return;
        setWeaponRows(data.weapon.filter((row) => row.weaponname));
      })
      .catch(() => {
        if (!mounted) return;
        setWeaponRows([]);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("dobae_user_id");
    localStorage.removeItem("dobae_user_nickname");
    setUserId(null);
    setNickname("");
    setMoney(0);
    setOwned([]);
    router.push("/login");
  };


  const baseWorkPower = owned.reduce((acc, cur) => acc + (Number(cur.workPower) || 0), 0);
  const weapon = weaponRows.find((row) => row.weaponname === equippedWeapon);
  const weaponMultiplier = weapon?.skill ? Number(weapon.skill) : 1;
  const totalWorkPower = Math.max(1, Math.round(baseWorkPower * weaponMultiplier));

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-5xl px-4 py-12">
        <div className="rounded-2xl bg-slate-900 p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-slate-400">도배 반장 성장 게임</div>
              <h1 className="text-2xl font-extrabold">도배반장 키우기</h1>
              <p className="mt-1 text-sm text-slate-300">
                로그인 후 원하는 메뉴를 선택해.
              </p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-xl bg-slate-800 px-4 py-2 text-sm font-semibold hover:bg-slate-700"
            >
              로그아웃
            </button>
          </div>

          {userId ? (
            <div className="mt-6">
              <div className="text-sm text-slate-400">
                접속 계정: <span className="font-semibold text-slate-100">{nickname || userId}</span>
              </div>

              <div className="mt-3 rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-xs text-slate-400">보유 머니</div>
                    <div className="text-lg font-semibold">{money.toLocaleString("ko-KR")}원</div>
                  </div>
                  <div className="text-xs text-slate-400">
                    보유 반장: <span className="font-semibold text-slate-100">{owned.length}명</span>
                  </div>
                </div>

                <div className="mt-3 text-sm text-slate-300">
                  기본 작업력 합계: <span className="font-semibold text-slate-100">{baseWorkPower.toLocaleString("ko-KR")}</span>
                </div>
                <div className="mt-1 text-sm text-slate-300">
                  보유 무기: <span className="font-semibold text-slate-100">{equippedWeapon || "없음"}</span>
                  <span className="ml-2 text-xs text-slate-400">X {weaponMultiplier}</span>
                </div>
                <div className="mt-1 text-sm text-slate-700">
                  총 합계 작업력: <span className="font-semibold text-slate-100">{totalWorkPower.toLocaleString("ko-KR")}</span>
                </div>

                {owned.length > 0 && (
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {owned.slice(0, 4).map((worker) => (
                      <div
                        key={worker.uid}
                        className="rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-sm"
                      >
                        <div className="font-semibold text-slate-100">{worker.name}</div>
                        <div className="mt-1 text-xs text-slate-400">작업력 {worker.workPower}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <Link
                  href="/gacha"
                  className="rounded-2xl border border-slate-800 bg-slate-950/40 p-5 hover:border-slate-600"
                >
                  <div className="text-sm text-slate-400">1</div>
                  <div className="mt-1 text-lg font-semibold">반장 뽑기</div>
                  <p className="mt-2 text-sm text-slate-300">반장을 뽑아 작업력을 올려.</p>
                </Link>

                <Link
                  href="/worker"
                  className="rounded-2xl border border-slate-800 bg-slate-950/40 p-5 hover:border-slate-600"
                >
                  <div className="text-sm text-slate-400">2</div>
                  <div className="mt-1 text-lg font-semibold">반장 정보</div>
                  <p className="mt-2 text-sm text-slate-300">보유 반장과 정보를 확인해.</p>
                </Link>

                <Link
                  href="/map"
                  className="rounded-2xl border border-slate-800 bg-slate-950/40 p-5 hover:border-slate-600"
                >
                  <div className="text-sm text-slate-400">3</div>
                  <div className="mt-1 text-lg font-semibold">작업하러 가기</div>
                  <p className="mt-2 text-sm text-slate-300">현장 맵으로 이동해.</p>
                </Link>

                <Link
                  href="/store"
                  className="rounded-2xl border border-slate-800 bg-slate-950/40 p-5 hover:border-slate-600"
                >
                  <div className="text-sm text-slate-400">4</div>
                  <div className="mt-1 text-lg font-semibold">상점 가기</div>
                  <p className="mt-2 text-sm text-slate-300">장비와 아이템을 구매해.</p>
                </Link>
              </div>
            </div>
          ) : (
            <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-950/40 p-5 text-sm text-slate-300">
              로그인하면 4가지 메뉴를 선택할 수 있어.
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

function parseWeaponState(raw: string) {
  if (!raw) return { owned: [], equipped: "" };
  try {
    const parsed = JSON.parse(raw) as { owned?: string[]; equipped?: string };
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
