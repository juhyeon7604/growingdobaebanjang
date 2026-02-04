"use client";

import Link from "next/link";

const RULES = [
  "반장은 1명만 소유 가능합니다.",
  "반장이 있는데 다시 반장 뽑기를 누르면 반장이 체인지 됩니다.",
  "반장마다 기본 스텟이 다릅니다. 랭크에 따라서.",
  "작업하러 갈 때 지도에서 빨간색일수록 작업이 어려운 지역입니다.",
  "현장 맵에 들어가면 왼쪽 위에 평균 그 지역의 작업량 미니멈~맥시멈이 적혀 있음.",
  "방향키로 움직인 뒤 집에서 Enter로 입장.",
  "작업 시간 계산은 작업량 ÷ 작업력 = 초임. 예: 작업량 100, 작업력 50이면 2초.",
  "인건비는 작업량 100당 1품(30만원) 지급.",
  "잘못 들어갔다가 작업량이 빡세서 대마치고 싶다면 해당 현장 인건비의 50%가 차감됨.",
  "아이템은 끼면 캐릭터 기본 스탯에 X00 배수가 적용됨.",
];

export default function InformationPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-5xl px-4 py-12">
        <div className="rounded-2xl bg-slate-900 p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-slate-400">게임 설명서</div>
              <h1 className="text-2xl font-extrabold">도배반장 키우기 규칙</h1>
              <p className="mt-1 text-sm text-slate-300">게임 진행 규칙을 확인해.</p>
            </div>
            <Link
              href="/"
              className="rounded-xl bg-slate-800 px-4 py-2 text-sm font-semibold hover:bg-slate-700"
            >
              돌아가기
            </Link>
          </div>

          <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-950/40 p-5">
            <ol className="space-y-4 text-2xl text-black">
              {RULES.map((rule, index) => (
                <li key={rule} className="flex gap-3">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 text-sm font-semibold text-slate-100">
                    {index + 1}
                  </span>
                  <span className="leading-relaxed">※ {rule}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </main>
  );
}
