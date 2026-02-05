"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AccountRow, SaveRow, WeaponRow, WorkerRow, fetchSheetData } from "../../lib/sheets";

type RankRow = {
  id: string;
  rank: number;
  name: string;
  money: number;
  workPower: number;
  weaponImage?: string;
};

export default function RankingPage() {
  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [saves, setSaves] = useState<SaveRow[]>([]);
  const [weapons, setWeapons] = useState<WeaponRow[]>([]);
  const [workers, setWorkers] = useState<WorkerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);

    fetchSheetData()
      .then((data) => {
        if (!mounted) return;
        setAccounts(data.account ?? []);
        setWeapons(data.weapon ?? []);
        setWorkers(data.worker ?? []);
        setSaves(data.save ?? []);
        setLoading(false);
      })
      .catch(() => {
        if (!mounted) return;
        setError("랭킹 정보를 불러오지 못했어.");
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const weaponMap = useMemo(() => {
    const map = new Map<string, WeaponRow>();
    weapons.forEach((w) => {
      if (w.weaponname) map.set(w.weaponname, w);
    });
    return map;
  }, [weapons]);

  const workerMap = useMemo(() => {
    const map = new Map<string, WorkerRow>();
    workers.forEach((w) => {
      if (w.name) map.set(w.name, w);
    });
    return map;
  }, [workers]);

  const rows = useMemo(() => {
    const saveMap = new Map<string, SaveRow>();
    saves.forEach((s) => {
      if (s.id) saveMap.set(s.id, s);
    });

    const list = accounts.map((account) => {
      const save = saveMap.get(account.id);
      const money = save?.money ?? 0;
      const workerNames = parseWorkerNames(save?.worker ?? "");
      const baseWork = workerNames.reduce((acc, name) => {
        const row = workerMap.get(name);
        return acc + (row?.skill ? Number(row.skill) : 0);
      }, 0);
      const equippedWeapon = parseEquippedWeapon(save?.weapon ?? "");
      const weaponSkill = equippedWeapon ? weaponMap.get(equippedWeapon)?.skill : undefined;
      const multiplier = weaponSkill ? Number(weaponSkill) : 1;
      const workPower = Math.round(baseWork * multiplier);
      const weaponImage = getWeaponImageSrc(equippedWeapon, weaponMap);

      return {
        id: account.id,
        rank: 0,
        name: account.nickname || account.id,
        money,
        workPower,
        weaponImage,
      };
    });

    return list
      .sort((a, b) => b.money - a.money)
      .map((row, idx) => ({ ...row, rank: idx + 1 }));
  }, [accounts, saves, workerMap, weaponMap]);

  const topRanks = rows.slice(0, 3);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-4 py-8">
        <div className="flex-1 rounded-2xl bg-slate-900 p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-slate-400">도배 반장 성장 게임</div>
              <h1 className="text-2xl font-extrabold">랭킹</h1>
              <p className="mt-2 text-sm text-slate-300">보유 머니 기준.</p>
            </div>
            <Link
              href="/"
              className="rounded-xl bg-slate-800 px-4 py-2 text-sm font-semibold hover:bg-slate-700"
            >
              메인으로
            </Link>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
              {loading ? (
                <div className="text-sm text-slate-300">불러오는 중...</div>
              ) : error ? (
                <div className="text-sm text-rose-300">{error}</div>
              ) : (
                <div className="overflow-hidden rounded-xl border border-slate-800">
                  <table className="min-w-full text-sm">
                    <thead className="bg-slate-950/60 text-slate-400">
                      <tr>
                        <th className="px-5 py-3 text-left">순위</th>
                        <th className="px-4 py-3 text-left">닉네임</th>
                        <th className="px-4 py-3 text-right">보유 머니</th>
                        <th className="px-3 py-3 text-right">작업력</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {rows.map((row) => (
                        <tr key={`${row.name}-${row.rank}`}>
                          <td className="px-5 py-3">{row.rank}</td>
                          <td className="px-4 py-3 font-semibold text-slate-100">{row.name}</td>
                          <td className="px-4 py-3 text-right">
                            {row.money.toLocaleString("ko-KR")}원
                          </td>
                          <td className="px-3 py-3 text-right">
                            {row.workPower.toLocaleString("ko-KR")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="flex items-center justify-center rounded-xl border border-slate-800 bg-slate-950/40 p-4">
              <div className="relative w-full max-w-[1500px]">
                <img
                  src="/rankingtable.png"
                  alt="랭킹 테이블"
                  className="w-1/2 rounded-xl object-contain mx-auto"
                />
                <div className="absolute left-[6%] top-[34%]">
                  <div className="relative">
                      <span className="absolute -top+30 left-42 -translate-x-1/2 whitespace-nowrap rounded-full bg-amber-400 px-6 py-2.5 text-base font-extrabold text-slate-900">
                      {rows[0]?.name ?? "1위"}
                    </span>
                    {topRanks[0]?.weaponImage && (
                      <img
                        src={topRanks[0].weaponImage}
                        alt="1위 무기"
                        className="pointer-events-none absolute right-57 top-15 h-24 w-24 object-contain"
                      />
                    )}
                    <img src="/dobaebanjang.png" alt="1위" className="h-[25rem] w-[25rem] object-contain" />
                  </div>
                </div>
                <div className="absolute left-[-9.5%] top-[39%]">
                  <div className="relative">
                      <span className="absolute -top+30 left-42 -translate-x-1/2 whitespace-nowrap rounded-full bg-slate-200 px-6 py-2.5 text-base font-extrabold text-slate-900">
                      {rows[1]?.name ?? "2위"}
                    </span>
                    {topRanks[1]?.weaponImage && (
                      <img
                        src={topRanks[1].weaponImage}
                        alt="2위 무기"
                        className="pointer-events-none absolute right-59 top-18 h-20 w-20 object-contain"
                      />
                    )}
                    <img src="/dobaebanjang.png" alt="2위" className="h-[25rem] w-[25rem] object-contain" />
                  </div>
                </div>
                <div className="absolute left-[16%] top-[48%]">
                  <div className="relative">
                      <span className="absolute -top-5 left-55 -translate-x-1/2 whitespace-nowrap rounded-full bg-orange-300 px-6 py-2.5 text-base font-extrabold text-slate-900">
                      {rows[2]?.name ?? "3위"}
                    </span>
                    {topRanks[2]?.weaponImage && (
                      <img
                        src={topRanks[2].weaponImage}
                        alt="3위 무기"
                        className="pointer-events-none absolute right-64 top-10 h-20 w-20 object-contain"
                      />
                    )}
                    <img src="/dobaebanjang.png" alt="3위" className="h-[19rem] w-[30rem] object-contain" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

function parseWorkerNames(raw: string) {
  if (!raw) return [] as string[];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.map((item) => String(item)).filter(Boolean);
    }
  } catch {
    // ignore
  }

  return raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseEquippedWeapon(raw: string) {
  if (!raw) return "";
  try {
    const parsed = JSON.parse(raw) as { equipped?: string };
    if (parsed && typeof parsed === "object") {
      return parsed.equipped ? String(parsed.equipped) : "";
    }
  } catch {
    // ignore
  }

  return String(raw);
}

function getWeaponImageSrc(weaponName: string, weaponMap: Map<string, WeaponRow>) {
  if (!weaponName) return "";
  const row = weaponMap.get(weaponName);
  const file = row?.png || row?.weaponname || weaponName;
  if (!file) return "";
  const trimmed = String(file).trim();
  if (!trimmed) return "";
  return trimmed.startsWith("/") ? trimmed : `/${trimmed.endsWith(".png") ? trimmed : `${trimmed}.png`}`;
}
