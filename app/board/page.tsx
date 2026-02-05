"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { BoardRow, addBoardPost, fetchSheetData } from "../../lib/sheets";

export default function BoardPage() {
  const [nickname, setNickname] = useState("");
  const [memo, setMemo] = useState("");
  const [posts, setPosts] = useState<BoardRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const listRef = useRef<HTMLDivElement | null>(null);

  const loadBoard = () => {
    setLoading(true);
    fetchSheetData()
      .then((data) => {
        setPosts(data.board ?? []);
        setLoading(false);
      })
      .catch(() => {
        setError("게시판을 불러오지 못했어.");
        setLoading(false);
      });
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    const nick = localStorage.getItem("dobae_user_nickname");
    const id = localStorage.getItem("dobae_user_id");
    setNickname(nick || id || "익명");
    loadBoard();
  }, []);

  const sortedPosts = useMemo(() => {
    return [...posts].sort((a, b) => {
      const aTime = Date.parse(a.createdAt) || 0;
      const bTime = Date.parse(b.createdAt) || 0;
      return aTime - bTime;
    });
  }, [posts]);

  useEffect(() => {
    if (!listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [sortedPosts, loading]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await submitPost();
  };

  const submitPost = async () => {
    const trimmedMemo = memo.trim();
    const storedNickname =
      (typeof window !== "undefined" && localStorage.getItem("dobae_user_nickname")) || "";
    const storedId = (typeof window !== "undefined" && localStorage.getItem("dobae_user_id")) || "";
    const trimmedNickname = storedNickname.trim() || storedId.trim() || nickname.trim() || "익명";

    if (!trimmedMemo) {
      setError("내용을 입력해줘.");
      return;
    }

    setPosting(true);
    setError(null);
    try {
      const result = await addBoardPost(trimmedNickname, trimmedMemo);
      if (!result.ok) {
        setError(result.message ?? "등록 실패");
        setPosting(false);
        return;
      }
      setMemo("");
      loadBoard();
    } catch {
      setError("등록에 실패했어.");
    } finally {
      setPosting(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex h-screen max-w-6xl flex-col overflow-hidden rounded-2xl bg-slate-900/40 px-4 py-8">
        <div className="rounded-2xl bg-slate-900 p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-slate-400">도배 반장 성장 게임</div>
              <h1 className="text-2xl font-extrabold">자유게시판</h1>
              <p className="mt-2 text-sm text-slate-300">자유롭게 글을 남겨줘.</p>
            </div>
            <Link
              href="/"
              className="rounded-xl bg-slate-800 px-4 py-2 text-sm font-semibold hover:bg-slate-700"
            >
              메인으로
            </Link>
          </div>
        </div>

        <div
          ref={listRef}
          className="mt-6 flex-1 space-y-3 overflow-y-auto rounded-2xl border border-slate-800 bg-slate-950/40 p-4"
        >
          {loading ? (
            <div className="text-sm text-slate-400">불러오는 중...</div>
          ) : sortedPosts.length === 0 ? (
            <div className="text-sm text-slate-400">아직 글이 없어. 첫 글을 남겨줘.</div>
          ) : (
            sortedPosts.map((post, index) => (
              <div
                key={`${post.nickname}-${post.createdAt}-${index}`}
                className="rounded-xl border border-lime-400/30 bg-lime-400/20 p-4"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm font-semibold text-slate-100">{post.nickname || "익명"}</div>
                  <div className="text-xs text-slate-400">
                    {post.createdAt ? new Date(post.createdAt).toLocaleString("ko-KR") : ""}
                  </div>
                </div>
                <p className="mt-2 whitespace-pre-line text-sm text-slate-200">{post.memo}</p>
              </div>
            ))
          )}
        </div>

        <form
          onSubmit={handleSubmit}
          className="mt-4 rounded-2xl border border-slate-800 bg-slate-900 p-4"
        >
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span> {nickname || ""}</span>
          </div>
          <div className="mt-3 flex items-stretch gap-3">
            <textarea
              value={memo}
              onChange={(event) => setMemo(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  submitPost();
                }
              }}
              className="min-h-[72px] flex-1 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-slate-500 focus:outline-none"
              placeholder="내용을 입력해줘"
              rows={3}
            />
            <button
              type="submit"
              disabled={posting}
              className="min-h-[72px] min-w-[120px] rounded-xl bg-emerald-600 px-6 py-3 text-base font-semibold hover:bg-emerald-500 disabled:opacity-50"
            >
              {posting ? "등록 중..." : "보내기"}
            </button>
          </div>

          {error && <div className="mt-2 text-sm text-rose-300">{error}</div>}
        </form>
      </div>
    </main>
  );
}
