const SHEET_API_URL = "/api/sheets";

export type AccountRow = {
  id: string;
  password: string;
  nickname: string;
};

export type WeaponRow = {
  weaponname: string;
  skill: number;
  price: number;
  png?: string;
};

export type AreaRow = {
  rank: number;
  area: string;
  minimum: number;
  maximum: number;
};

export type WorkerRow = {
  name: string;
  skill: number;
  grade: string;
  probability?: number;
};

export type OwnedCharacter = {
  uid: string;
  defId: string;
  name: string;
  rarity: "COMMON" | "RARE" | "EPIC" | "LEGENDARY" | "MYTHIC";
  workPower: number;
  obtainedAt: number;
};

export type SaveData = {
  money: number;
  owned: OwnedCharacter[];
  storageSlots: number;
  weapon?: string;
};

export type WeaponState = {
  owned: string[];
  equipped: string;
};

export type SheetData = {
  account: AccountRow[];
  weapon: WeaponRow[];
  area: AreaRow[];
  worker: WorkerRow[];
};

type LoginResponse = {
  ok: boolean;
  message?: string;
  user?: { id: string; nickname: string };
  save?: { money?: number; weapon?: string; worker?: OwnedCharacter[] | string };
};

const toNumber = (value: unknown) => {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const cleaned = value.replace(/[% ,]/g, "").trim();
    const parsed = Number(cleaned);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  return 0;
};

const toText = (value: unknown) => (value == null ? "" : String(value));

export async function fetchSheetData(): Promise<SheetData> {
  const response = await fetch(SHEET_API_URL, { cache: "no-store" });
  if (!response.ok) {
    throw new Error("Failed to fetch sheet data");
  }
  const raw = (await response.json()) as Partial<SheetData>;

  return {
    account: Array.isArray(raw.account)
      ? raw.account.map((row) => ({
          id: toText(row.id),
          password: toText(row.password),
          nickname: toText(row.nickname),
        }))
      : [],
    weapon: Array.isArray(raw.weapon)
      ? raw.weapon.map((row) => ({
          weaponname: toText(row.weaponname),
          skill: toNumber(row.skill),
          price: toNumber(row.price),
          png: toText((row as { png?: unknown }).png),
        }))
      : [],
    area: Array.isArray(raw.area)
      ? raw.area.map((row) => ({
          rank: toNumber(row.rank),
          area: toText(row.area),
          minimum: toNumber(row.minimum),
          maximum: toNumber(row.maximum),
        }))
      : [],
    worker: Array.isArray(raw.worker)
      ? raw.worker.map((row) => ({
          name: toText(row.name),
          skill: toNumber(row.skill),
          grade: toText(row.grade),
          probability: toNumber(row.probability),
        }))
      : [],
  };
}

const normalizeSave = (save?: { money?: number; weapon?: string; worker?: OwnedCharacter[] | string }) => {
  const parsed = Array.isArray(save?.worker)
    ? save?.worker
    : typeof save?.worker === "string"
      ? (() => {
          try {
            return JSON.parse(save.worker);
          } catch {
            return save.worker
              .split(",")
              .map((item) => item.trim())
              .filter(Boolean);
          }
        })()
      : [];

  const owned = Array.isArray(parsed) && parsed.length && typeof parsed[0] === "object"
    ? (parsed as OwnedCharacter[])
    : [];

  const workerNames = Array.isArray(parsed) && parsed.length && typeof parsed[0] === "string"
    ? (parsed as string[])
    : [];

  return {
    money: toNumber(save?.money),
    owned,
    storageSlots: 1,
    weapon: save?.weapon ? String(save.weapon) : "",
    workerNames,
  };
};

const mapGradeToRarity = (grade: string): OwnedCharacter["rarity"] => {
  const normalized = grade.trim().toUpperCase();
  if (normalized === "A") return "MYTHIC";
  if (normalized === "B") return "LEGENDARY";
  if (normalized === "C") return "EPIC";
  if (normalized === "D") return "RARE";
  return "RARE";
};

export async function loginWithSheet(id: string, password: string) {
  const response = await fetch(SHEET_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "login", id, password }),
  });

  if (!response.ok) {
    throw new Error("Login failed");
  }

  const data = (await response.json()) as LoginResponse;
  if (!data.ok || !data.user) {
    return { ok: false, message: data.message ?? "로그인 실패" } as const;
  }

  const normalized = normalizeSave(data.save);
  let owned = normalized.owned;

  if (!owned.length && normalized.workerNames?.length) {
    try {
      const sheet = await fetchSheetData();
      owned = normalized.workerNames.map((name, index) => {
        const row = sheet.worker.find((w) => w.name === name);
        return {
          uid: `${Date.now()}-${index}-${name}`,
          defId: `${name}-${index}`,
          name,
          rarity: row ? mapGradeToRarity(row.grade) : "RARE",
          workPower: row ? row.skill : 10,
          obtainedAt: Date.now(),
        } as OwnedCharacter;
      });
    } catch {
      // ignore
    }
  }

  return {
    ok: true as const,
    user: data.user,
    save: {
      money: normalized.money,
      owned,
      storageSlots: normalized.storageSlots,
      weapon: normalized.weapon,
    },
  };
}

export async function saveUserData(id: string, save: SaveData) {
  const response = await fetch(SHEET_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "save",
      id,
      money: save.money,
      weapon: save.weapon ?? "",
      worker: JSON.stringify((save.owned ?? []).map((item) => item.name)),
    }),
  });

  if (!response.ok) {
    throw new Error("Save failed");
  }

  const data = (await response.json()) as { ok?: boolean };
  return Boolean(data.ok);
}
