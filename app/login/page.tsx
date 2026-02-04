"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { loginWithSheet, SaveData } from "../../lib/sheets";
import { getUserStorageKey } from "../../lib/storage";

export default function LoginPage() {
  const router = useRouter();
  const [id, setId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!id.trim() || !password.trim()) {
      setError("아이디와 비밀번호를 입력해줘.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await loginWithSheet(id.trim(), password.trim());
      if (!result.ok) {
        setError(result.message ?? "로그인 실패");
        setLoading(false);
        return;
      }

      const storageKey = getUserStorageKey(result.user.id);
      const save: SaveData = result.save ?? { money: 0, owned: [], storageSlots: 1 };

      localStorage.setItem("dobae_user_id", result.user.id);
      localStorage.setItem("dobae_user_nickname", result.user.nickname ?? "");
      localStorage.setItem(storageKey, JSON.stringify(save));

      router.push("/");
    } catch {
      setError("로그인에 실패했어. 다시 시도해줘.");
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-md px-4 py-16">
        <div className="rounded-2xl bg-slate-900 p-6">
          <h1 className="text-2xl font-extrabold">로그인</h1>
          <p className="mt-2 text-sm text-slate-300">계정 정보로 접속해.</p>

          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <label className="block text-sm text-slate-300">
              아이디
              <input
                value={id}
                onChange={(event) => setId(event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-slate-500 focus:outline-none"
                placeholder="아이디 입력"
              />
            </label>

            <label className="block text-sm text-slate-300">
              비밀번호
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-slate-500 focus:outline-none"
                placeholder="비밀번호 입력"
              />
            </label>

            {error && <div className="text-sm text-rose-300">{error}</div>}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-sky-700 px-4 py-2 text-sm font-semibold hover:bg-sky-600 disabled:opacity-50"
            >
              {loading ? "확인 중..." : "로그인"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}