"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getDifficultyColor } from "./raw/difficulty";
import { getDistrictPosition, seoulDistricts } from "./raw/districts";
import { AreaRow, fetchSheetData } from "../../lib/sheets";

export default function MapPage() {
  const router = useRouter();
  const [areaRows, setAreaRows] = useState<AreaRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    setIsLoading(true);
    fetchSheetData()
      .then((data) => {
        if (!mounted) return;
        setAreaRows(data.area.filter((row) => row.area));
        setIsLoading(false);
      })
      .catch(() => {
        if (!mounted) return;
        setAreaRows([]);
        setIsLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const getRankColor = (rank: number) => {
    if (rank <= 5) return "hsl(0 80% 45%)";
    if (rank <= 10) return "hsl(0 70% 60%)";
    if (rank <= 15) return "hsl(330 70% 70%)";
    if (rank <= 20) return "hsl(90 60% 65%)";
    return "hsl(120 65% 40%)";
  };

  const districtList = areaRows.length ? areaRows.map((row) => row.area) : seoulDistricts;
  const getAreaColor = (district: string) => {
    const row = areaRows.find((item) => item.area === district);
    if (row) return getRankColor(row.rank || 0);
    return getDifficultyColor(district);
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-5xl px-4 py-10">
        <div className="rounded-2xl bg-slate-900 p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-slate-400">지역 선택</div>
              <h1 className="text-2xl font-extrabold">서울 지역 선택</h1>
              <p className="mt-2 text-sm text-slate-300">지도에서 구를 선택해.</p>
            </div>
            <Link
              href="/"
              className="rounded-xl bg-slate-800 px-4 py-2 text-sm font-semibold hover:bg-slate-700"
            >
              돌아가기
            </Link>
          </div>

          <div className="mt-6">
            <div className="relative mx-auto w-full max-w-[720px]">
              <img
                src="/map.png"
                alt="서울 지도"
                className="w-full rounded-xl border border-slate-800 bg-white"
              />
              {isLoading && (
                <div className="absolute inset-0 z-20 flex items-center justify-center rounded-xl bg-black/20 text-sm text-slate-100">
                  로딩 중...
                </div>
              )}
              {districtList.map((d) => (
                <button
                  key={d}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-md px-2 py-1 text-[10px] text-white shadow-sm ${
                    isLoading ? "pointer-events-none opacity-60" : ""
                  }`}
                  style={{
                    ...getDistrictPosition(d),
                    backgroundColor: getAreaColor(d),
                  }}
                  disabled={isLoading}
                  onClick={() => {
                    if (typeof document !== "undefined" && document.documentElement.requestFullscreen) {
                      document.documentElement.requestFullscreen().catch(() => {});
                    }
                    router.push(`/map/${encodeURIComponent(d)}`);
                  }}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
