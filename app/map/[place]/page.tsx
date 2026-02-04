"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { DISTRICT_DIFFICULTY, getDifficultyColor } from "../raw/difficulty";
import { getDistrictPosition, seoulDistricts } from "../raw/districts";
import { AreaRow, WeaponState, fetchSheetData } from "../../../lib/sheets";
import { DEFAULT_STORAGE_KEY, getUserStorageKey } from "../../../lib/storage";

const MAP_W = 30;
const MAP_H = 18;
const TILE = 96;
const PLAYER_W = Math.round(TILE * 0.8) * 3;
const PLAYER_H = Math.round(TILE * 0.9) * 3;
const PLAYER_Y_OFFSET = Math.round(TILE * 0.38);
const HOUSE_SIZE = Math.round(TILE * 0.9);
const VIEW_PX_W = Math.round(96 * 18.5);
const VIEW_PX_H = 96 * 9;
const MIN_MARGIN = 1;
const MIN_PATH_MARGIN = 2;

type House = { x: number; y: number };
type MapConfig = {
  houses: House[];
  pathTiles: Set<string>;
  plazaTiles: Set<string>;
};

function coordKey(x: number, y: number) {
  return `${x},${y}`;
}

function clampInt(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Math.floor(n)));
}

function hashString(value: string) {
  let h = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function addHorizontalLine(pathTiles: Set<string>, y: number) {
  for (let x = 0; x < MAP_W; x += 1) {
    pathTiles.add(coordKey(x, y));
  }
}

function addVerticalLine(pathTiles: Set<string>, x: number) {
  for (let y = 0; y < MAP_H; y += 1) {
    pathTiles.add(coordKey(x, y));
  }
}

function addRectTiles(target: Set<string>, x: number, y: number, w: number, h: number) {
  const x0 = clampInt(x, 0, MAP_W - 1);
  const y0 = clampInt(y, 0, MAP_H - 1);
  const x1 = clampInt(x + w - 1, 0, MAP_W - 1);
  const y1 = clampInt(y + h - 1, 0, MAP_H - 1);
  for (let yy = y0; yy <= y1; yy += 1) {
    for (let xx = x0; xx <= x1; xx += 1) {
      target.add(coordKey(xx, yy));
    }
  }
}

function buildMap(place: string, rank?: number | null): MapConfig {
  const seed = hashString(place);
  const rng = mulberry32(seed);
  const pathTiles = new Set<string>();
  const plazaTiles = new Set<string>();
  const rankValue = clampInt(rank ?? 15, 1, 25);

  const mainY = clampInt(2 + rng() * (MAP_H - 4), MIN_PATH_MARGIN, MAP_H - 1 - MIN_PATH_MARGIN);
  const mainX = clampInt(2 + rng() * (MAP_W - 4), MIN_PATH_MARGIN, MAP_W - 1 - MIN_PATH_MARGIN);

  addHorizontalLine(pathTiles, mainY);
  addVerticalLine(pathTiles, mainX);

  if (rng() > 0.35) {
    const offset = rng() > 0.5 ? 3 : -3;
    const y2 = clampInt(mainY + offset, MIN_PATH_MARGIN, MAP_H - 1 - MIN_PATH_MARGIN);
    addHorizontalLine(pathTiles, y2);
  }

  if (rng() > 0.35) {
    const offset = rng() > 0.5 ? 4 : -4;
    const x2 = clampInt(mainX + offset, MIN_PATH_MARGIN, MAP_W - 1 - MIN_PATH_MARGIN);
    addVerticalLine(pathTiles, x2);
  }

  const plazaSize = 3 + Math.floor(rng() * 3);
  const plazaCenterX = clampInt(mainX + (rng() * 5 - 2.5), MIN_PATH_MARGIN, MAP_W - 1 - MIN_PATH_MARGIN);
  const plazaCenterY = clampInt(mainY + (rng() * 5 - 2.5), MIN_PATH_MARGIN, MAP_H - 1 - MIN_PATH_MARGIN);
  addRectTiles(
    plazaTiles,
    plazaCenterX - Math.floor(plazaSize / 2),
    plazaCenterY - Math.floor(plazaSize / 2),
    plazaSize,
    plazaSize,
  );

  if (rng() > 0.55) {
    const secondSize = 3 + Math.floor(rng() * 2);
    const secondX = clampInt(rng() * (MAP_W - secondSize), MIN_MARGIN, MAP_W - secondSize - MIN_MARGIN);
    const secondY = clampInt(rng() * (MAP_H - secondSize), MIN_MARGIN, MAP_H - secondSize - MIN_MARGIN);
    addRectTiles(plazaTiles, secondX, secondY, secondSize, secondSize);
  }

  const houses: House[] = [];
  const baseCount = 12 - Math.floor((rankValue - 1) / 2.5);
  const variation = (seed % 3) - 1;
  const houseCount = clampInt(baseCount + variation, 3, 14);
  const maxAttempts = 400;
  let attempts = 0;

  while (houses.length < houseCount && attempts < maxAttempts) {
    attempts += 1;
    const x = clampInt(MIN_MARGIN + rng() * (MAP_W - 2 * MIN_MARGIN), MIN_MARGIN, MAP_W - 1 - MIN_MARGIN);
    const y = clampInt(MIN_MARGIN + rng() * (MAP_H - 2 * MIN_MARGIN), MIN_MARGIN, MAP_H - 1 - MIN_MARGIN);
    const key = coordKey(x, y);
    if (pathTiles.has(key) || plazaTiles.has(key)) continue;
    if (houses.some((h) => h.x === x && h.y === y)) continue;
    houses.push({ x, y });
  }

  return { houses, pathTiles, plazaTiles };
}


function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function isHouseTile(x: number, y: number, houses: House[]) {
  return houses.some((h) => h.x === x && h.y === y);
}

function getTileType(x: number, y: number, pathTiles: Set<string>, plazaTiles: Set<string>) {
  const key = coordKey(x, y);
  if (plazaTiles.has(key)) return "plaza";
  if (pathTiles.has(key)) return "path";
  return "grass";
}

function getTerrainColor(rank: number | null | undefined, tileType: "grass" | "path" | "plaza") {
  const rankValue = clampInt(rank ?? 15, 1, 25);
  const t = (rankValue - 1) / 24;
  const hue = 120 - 110 * t;
  const base = tileType === "grass" ? 32 : tileType === "path" ? 52 : 62;
  const lightness = clampInt(base - Math.round(t * 10), 18, 70);
  const saturation = tileType === "plaza" ? 85 : 80;
  return `hsl(${hue} ${saturation}% ${lightness}%)`;
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

export default function PlaceMapPage() {
  const params = useParams();
  const place =
    typeof params.place === "string" ? decodeURIComponent(params.place) : "서울";
  const router = useRouter();
  const [playerPos, setPlayerPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [lastHouse, setLastHouse] = useState<{ x: number; y: number } | null>(null);
  const [moving, setMoving] = useState<boolean>(false);
  const [direction, setDirection] = useState<"up" | "down" | "left" | "right">("down");
  const [currentWork, setCurrentWork] = useState<number | null>(null);
  const [regionOpen, setRegionOpen] = useState<boolean>(false);
  const [areaRows, setAreaRows] = useState<AreaRow[]>([]);
  const [weaponImage, setWeaponImage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const placeRank = areaRows.find((row) => row.area === place)?.rank ?? null;
  const mapConfig = useMemo(() => buildMap(place, placeRank), [place, placeRank]);
  const storageKey = useMemo(() => {
    if (typeof window === "undefined") return DEFAULT_STORAGE_KEY;
    const userId = localStorage.getItem("dobae_user_id");
    return getUserStorageKey(userId) || DEFAULT_STORAGE_KEY;
  }, []);

  useEffect(() => {
    let mounted = true;
    setIsLoading(true);
    fetchSheetData()
      .then((data) => {
        if (!mounted) return;
        setAreaRows(data.area.filter((row) => row.area));
        let nextWeaponImage = "";
        try {
          const raw = localStorage.getItem(storageKey);
          if (raw) {
            const parsed = JSON.parse(raw) as { weapon?: string };
            if (typeof parsed.weapon === "string") {
              const weaponState = parseWeaponState(parsed.weapon);
              if (weaponState.equipped) {
                const weapon = data.weapon.find((row) => row.weaponname === weaponState.equipped);
                if (weapon?.png) {
                  nextWeaponImage = getWeaponImageSrc(weapon.png);
                }
              }
            }
          }
        } catch {
          nextWeaponImage = "";
        }
        setWeaponImage(nextWeaponImage);
      })
      .catch(() => {
        if (!mounted) return;
        setAreaRows([]);
        setWeaponImage("");
      })
      .finally(() => {
        if (!mounted) return;
        setIsLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [storageKey]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Enter"].includes(e.key)) {
        e.preventDefault();
      }
      if (isLoading) return;

      if (e.key === "Enter") {
        if (lastHouse) {
          const sheetRange = areaRows.find((row) => row.area === place);
          const range = sheetRange
            ? { min: sheetRange.minimum, max: sheetRange.maximum }
            : (DISTRICT_DIFFICULTY[place] ?? { min: 100, max: 200 });
          const workAmount = Math.floor(randInt(range.min, range.max) / 100) * 100;
          setCurrentWork(workAmount);
          router.push(`/work?place=${encodeURIComponent(place)}&work=${workAmount}`);
        }
        return;
      }

      setPlayerPos((p) => {
        let nx = p.x;
        let ny = p.y;

        if (e.key === "ArrowUp") {
          ny -= 1;
          setDirection("up");
        }
        if (e.key === "ArrowDown") {
          ny += 1;
          setDirection("down");
        }
        if (e.key === "ArrowLeft") {
          nx -= 1;
          setDirection("left");
        }
        if (e.key === "ArrowRight") {
          nx += 1;
          setDirection("right");
        }

        setMoving(true);
        window.clearTimeout((window as Window & { __walkTimer?: number }).__walkTimer);
        (window as Window & { __walkTimer?: number }).__walkTimer = window.setTimeout(() => {
          setMoving(false);
        }, 120);

        nx = clamp(nx, 0, MAP_W - 1);
        ny = clamp(ny, 0, MAP_H - 1);
        return { x: nx, y: ny };
      });
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [areaRows, lastHouse, place, router, isLoading]);

  useEffect(() => {
    const house = mapConfig.houses.find((h) => h.x === playerPos.x && h.y === playerPos.y) ?? null;
    setLastHouse(house);
  }, [playerPos, mapConfig.houses]);

  const sheetRange = areaRows.find((row) => row.area === place);
  const range = sheetRange
    ? { min: sheetRange.minimum, max: sheetRange.maximum }
    : DISTRICT_DIFFICULTY[place];

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
              <h1 className="text-2xl font-extrabold">🗺️ {place} 현장 맵</h1>
              <p className="mt-2 text-sm text-slate-300">
                방향키로 이동해. 집(🏠) 위에 서면 Enter로 작업 시작.
              </p>
              {range && (
                <p className="mt-1 text-xs text-slate-400">
                  작업량 범위: {range.min.toLocaleString("ko-KR")} ~ {range.max.toLocaleString("ko-KR")}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/"
                className={`rounded-xl bg-slate-800 px-4 py-2 text-sm font-semibold hover:bg-slate-700 ${
                  isLoading ? "pointer-events-none opacity-60" : ""
                }`}
              >
                정비하기
              </Link>
              <button
                className={`rounded-xl bg-slate-800 px-4 py-2 text-sm font-semibold hover:bg-slate-700 ${
                  isLoading ? "pointer-events-none opacity-60" : ""
                }`}
                onClick={() => setRegionOpen(true)}
                disabled={isLoading}
              >
                지역선택
              </button>
            </div>
          </div>

          <div className="mt-6 rounded-xl border border-slate-800 bg-slate-950/40 p-4">
            <div
              className="relative overflow-hidden rounded-xl border border-slate-800 bg-slate-950"
              style={{ width: VIEW_PX_W, height: VIEW_PX_H }}
            >
              {isLoading && (
                <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/20 text-sm text-slate-100">
                  로딩 중...
                </div>
              )}
              {(() => {
                const maxX = MAP_W * TILE - VIEW_PX_W;
                const maxY = MAP_H * TILE - VIEW_PX_H;
                const focusX = playerPos.x * TILE + TILE / 2;
                const focusY = playerPos.y * TILE + TILE / 2;
                const offsetX = clamp(focusX - VIEW_PX_W / 2, 0, maxX);
                const offsetY = clamp(focusY - VIEW_PX_H / 2, 0, maxY);

                return (
                  <div
                    className="absolute left-0 top-0"
                    style={{
                      width: MAP_W * TILE,
                      height: MAP_H * TILE,
                      transform: `translate(${-offsetX}px, ${-offsetY}px)`,
                      transition: "transform 120ms linear",
                    }}
                  >
                    <div
                      className="grid"
                      style={{
                        gridTemplateColumns: `repeat(${MAP_W}, ${TILE}px)`,
                        gridTemplateRows: `repeat(${MAP_H}, ${TILE}px)`,
                      }}
                    >
                      {Array.from({ length: MAP_W * MAP_H }).map((_, idx) => {
                        const x = idx % MAP_W;
                        const y = Math.floor(idx / MAP_W);
                        const tileType = getTileType(x, y, mapConfig.pathTiles, mapConfig.plazaTiles);
                        const hasHouse = isHouseTile(x, y, mapConfig.houses);

                        return (
                          <div
                            key={idx}
                            className="relative flex items-center justify-center"
                            style={{ backgroundColor: getTerrainColor(placeRank, tileType) }}
                          >
                            {hasHouse && (
                              <img
                                src="/house.png"
                                alt="집"
                                className="bg-transparent"
                                style={{ width: HOUSE_SIZE, height: HOUSE_SIZE }}
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>

                    <div
                      className={`absolute ${moving ? "animate-walk" : ""}`}
                      style={{
                        left: playerPos.x * TILE + (TILE - PLAYER_W) / 2,
                        top: playerPos.y * TILE + (TILE - PLAYER_H) / 2 + PLAYER_Y_OFFSET,
                        transition: "left 100ms linear, top 100ms linear",
                      }}
                    >
                      <div className="relative" style={{ width: PLAYER_W, height: PLAYER_H }}>
                        <img
                          src="/dobaebanjang.png"
                          alt="캐릭터"
                          style={{ width: PLAYER_W, height: PLAYER_H }}
                        />
                        {weaponImage && (
                          <img
                            src={weaponImage}
                            alt="장착 무기"
                            className="absolute"
                            style={{
                              width: 72,
                              height: 72,
                              left: 32,
                              top: 32,
                              transform: "rotate(-12deg)",
                            }}
                          />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            <div className="mt-3 text-xs text-slate-300">
              현재 위치: ({playerPos.x}, {playerPos.y})
              {lastHouse ? " · 집 입장 가능" : ""}
            </div>

            {currentWork !== null && (
              <div className="mt-2 rounded-lg bg-slate-950/60 px-3 py-2 text-xs text-slate-200">
                이번 작업량: {currentWork.toLocaleString("ko-KR")}
              </div>
            )}
          </div>
        </div>
      </div>
      <style jsx>{`
        .animate-walk {
          animation: bob 0.2s infinite alternate;
        }
        @keyframes bob {
          from {
            transform: translateY(0px);
          }
          to {
            transform: translateY(-3px);
          }
        }
      `}</style>

      {regionOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-slate-900 p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-slate-400">지역 선택</div>
                <h2 className="text-xl font-bold">서울 지역 선택</h2>
              </div>
              <button
                className="rounded-lg bg-slate-800 px-3 py-1 text-xs hover:bg-slate-700"
                onClick={() => setRegionOpen(false)}
              >
                닫기
              </button>
            </div>

            <div className="mt-4">
              <div className="relative mx-auto w-full max-w-[720px]">
                <img
                  src="/map.png"
                  alt="서울 지도"
                  className="w-full rounded-xl border border-slate-800 bg-white"
                />
                {districtList.map((d) => (
                  <button
                    key={d}
                    className="absolute -translate-x-1/2 -translate-y-1/2 rounded-md px-2 py-1 text-[10px] text-white shadow-sm"
                    style={{
                      ...getDistrictPosition(d),
                      backgroundColor: getAreaColor(d),
                    }}
                    onClick={() => {
                      if (typeof document !== "undefined" && document.documentElement.requestFullscreen) {
                        document.documentElement.requestFullscreen().catch(() => {});
                      }
                      setRegionOpen(false);
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
      )}
    </main>
  );
}
