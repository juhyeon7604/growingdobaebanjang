"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchSheetData, loginWithSheet, registerWithSheet, SaveData } from "../../lib/sheets";
import { getUserStorageKey } from "../../lib/storage";

export default function LoginPage() {
  const router = useRouter();
  const [id, setId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showSignup, setShowSignup] = useState(false);
  const [loginNotice, setLoginNotice] = useState<string | null>(null);
  const [signupId, setSignupId] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupNickname, setSignupNickname] = useState("");
  const [signupError, setSignupError] = useState<string | null>(null);
  const [signupSuccess, setSignupSuccess] = useState<string | null>(null);
  const [signupLoading, setSignupLoading] = useState(false);
  const [idCheckStatus, setIdCheckStatus] = useState<
    "idle" | "checking" | "available" | "duplicate" | "error"
  >("idle");
  const [nicknameCheckStatus, setNicknameCheckStatus] = useState<
    "idle" | "checking" | "available" | "duplicate" | "error"
  >("idle");

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

  const handleCheckId = async () => {
    const trimmed = signupId.trim();
    if (!trimmed) {
      setSignupError("아이디를 입력해줘.");
      setIdCheckStatus("error");
      return;
    }

    setSignupError(null);
    setIdCheckStatus("checking");

    try {
      const data = await fetchSheetData();
      const exists = data.account.some((row) => row.id === trimmed);
      setIdCheckStatus(exists ? "duplicate" : "available");
    } catch {
      setIdCheckStatus("error");
      setSignupError("아이디 중복 확인에 실패했어.");
    }
  };

  const handleCheckNickname = async () => {
    const trimmed = signupNickname.trim();
    if (!trimmed) {
      setSignupError("닉네임을 입력해줘.");
      setNicknameCheckStatus("error");
      return;
    }

    setSignupError(null);
    setNicknameCheckStatus("checking");

    try {
      const data = await fetchSheetData();
      const exists = data.account.some((row) => row.nickname === trimmed);
      setNicknameCheckStatus(exists ? "duplicate" : "available");
    } catch {
      setNicknameCheckStatus("error");
      setSignupError("닉네임 중복 확인에 실패했어.");
    }
  };

  const handleSignup = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedId = signupId.trim();
    const trimmedPassword = signupPassword.trim();
    const trimmedNickname = signupNickname.trim();

    if (!trimmedId || !trimmedPassword || !trimmedNickname) {
      setSignupError("아이디, 비밀번호, 닉네임을 모두 입력해줘.");
      return;
    }

    if (idCheckStatus !== "available") {
      setSignupError("아이디 중복 확인을 해줘.");
      return;
    }

    if (nicknameCheckStatus !== "available") {
      setSignupError("닉네임 중복 확인을 해줘.");
      return;
    }

    setSignupLoading(true);
    setSignupError(null);
    setSignupSuccess(null);

    try {
      const result = await registerWithSheet(trimmedId, trimmedPassword, trimmedNickname);
      if (!result.ok) {
        setSignupError(result.message ?? "회원가입 실패");
        setSignupLoading(false);
        return;
      }

      setSignupSuccess("회원가입 완료! 로그인해줘.");
      setSignupId("");
      setSignupPassword("");
      setSignupNickname("");
      setIdCheckStatus("idle");
      setNicknameCheckStatus("idle");
      setShowSignup(false);
      setLoginNotice("회원가입 성공! 로그인해줘.");
    } catch {
      setSignupError("회원가입에 실패했어. 다시 시도해줘.");
    } finally {
      setSignupLoading(false);
    }
  };

  useEffect(() => {
    setIdCheckStatus("idle");
    setSignupSuccess(null);
  }, [signupId]);

  useEffect(() => {
    setNicknameCheckStatus("idle");
    setSignupSuccess(null);
  }, [signupNickname]);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-md px-4 py-16">
        {!showSignup ? (
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

              {loginNotice && <div className="text-sm text-emerald-300">{loginNotice}</div>}
              {error && <div className="text-sm text-rose-300">{error}</div>}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-sky-700 px-4 py-2 text-sm font-semibold hover:bg-sky-600 disabled:opacity-50"
              >
                {loading ? "확인 중..." : "로그인"}
              </button>
            </form>

            <button
              type="button"
              onClick={() => setShowSignup(true)}
              className="mt-4 w-full rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-100 hover:bg-slate-800"
            >
              회원가입
            </button>
          </div>
        ) : (
          <div className="rounded-2xl bg-slate-900 p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-extrabold">회원가입</h2>
                <p className="mt-2 text-sm text-slate-300">아이디, 비밀번호, 닉네임을 등록해.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowSignup(false)}
                className="rounded-xl border border-slate-700 px-3 py-1 text-xs font-semibold text-slate-100 hover:bg-slate-800"
              >
                로그인
              </button>
            </div>

            <form className="mt-6 space-y-4" onSubmit={handleSignup}>
              <label className="block text-sm text-slate-300">
                아이디
                <div className="mt-2 flex gap-2">
                  <input
                    value={signupId}
                    onChange={(event) => setSignupId(event.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-slate-500 focus:outline-none"
                    placeholder="아이디 입력"
                  />
                  <button
                    type="button"
                    onClick={handleCheckId}
                    disabled={idCheckStatus === "checking"}
                    className="rounded-xl bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-100 hover:bg-slate-700 disabled:opacity-50"
                  >
                    {idCheckStatus === "checking" ? "확인 중" : "중복확인"}
                  </button>
                </div>
              </label>
              {idCheckStatus === "available" && (
                <div className="text-xs text-emerald-300">사용 가능한 아이디야.</div>
              )}
              {idCheckStatus === "duplicate" && (
                <div className="text-xs text-rose-300">이미 사용 중인 아이디야.</div>
              )}
              {idCheckStatus === "error" && (
                <div className="text-xs text-rose-300">아이디 확인에 실패했어.</div>
              )}

              <label className="block text-sm text-slate-300">
                비밀번호
                <input
                  type="password"
                  value={signupPassword}
                  onChange={(event) => setSignupPassword(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-slate-500 focus:outline-none"
                  placeholder="비밀번호 입력"
                />
              </label>

              <label className="block text-sm text-slate-300">
                닉네임
                <div className="mt-2 flex gap-2">
                  <input
                    value={signupNickname}
                    onChange={(event) => setSignupNickname(event.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-slate-500 focus:outline-none"
                    placeholder="닉네임 입력"
                  />
                  <button
                    type="button"
                    onClick={handleCheckNickname}
                    disabled={nicknameCheckStatus === "checking"}
                    className="rounded-xl bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-100 hover:bg-slate-700 disabled:opacity-50"
                  >
                    {nicknameCheckStatus === "checking" ? "확인 중" : "중복확인"}
                  </button>
                </div>
              </label>
              {nicknameCheckStatus === "available" && (
                <div className="text-xs text-emerald-300">사용 가능한 닉네임이야.</div>
              )}
              {nicknameCheckStatus === "duplicate" && (
                <div className="text-xs text-rose-300">이미 사용 중인 닉네임이야.</div>
              )}
              {nicknameCheckStatus === "error" && (
                <div className="text-xs text-rose-300">닉네임 확인에 실패했어.</div>
              )}

              {signupError && <div className="text-sm text-rose-300">{signupError}</div>}
              {signupSuccess && <div className="text-sm text-emerald-300">{signupSuccess}</div>}

              <button
                type="submit"
                disabled={signupLoading}
                className="w-full rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold hover:bg-emerald-500 disabled:opacity-50"
              >
                {signupLoading ? "처리 중..." : "회원가입"}
              </button>
            </form>
          </div>
        )}
      </div>
    </main>
  );
}