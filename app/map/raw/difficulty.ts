export type DifficultyRange = { min: number; max: number };

export const DISTRICT_DIFFICULTY: Record<string, DifficultyRange> = {
  금천구: { min: 100000, max: 300000 },
  관악구: { min: 80000, max: 100000 },
  구로구: { min: 60000, max: 80000 },
  강북구: { min: 50000, max: 60000 },
  은평구: { min: 40000, max: 50000 },
  성북구: { min: 30000, max: 40000 },
  중랑구: { min: 20000, max: 30000 },
  서대문구: { min: 10000, max: 20000 },
  동대문구: { min: 8000, max: 10000 },
  도봉구: { min: 7000, max: 8000 },
  영등포구: { min: 6000, max: 7000 },
  동작구: { min: 5000, max: 6000 },
  종로구: { min: 4000, max: 5000 },
  중구: { min: 3000, max: 4000 },
  성동구: { min: 2000, max: 3000 },
  강서구: { min: 1000, max: 2000 },
  양천구: { min: 900, max: 1000 },
  노원구: { min: 800, max: 900 },
  용산구: { min: 700, max: 800 },
  광진구: { min: 600, max: 700 },
  강동구: { min: 500, max: 600 },
  서초구: { min: 400, max: 500 },
  강남구: { min: 300, max: 400 },
  송파구: { min: 200, max: 300 },
  마포구: { min: 100, max: 200 },
};

const RANKED = Object.entries(DISTRICT_DIFFICULTY)
  .sort((a, b) => b[1].max - a[1].max)
  .map(([name]) => name);

export const getDifficultyColor = (district: string) => {
  const rankIndex = RANKED.indexOf(district) + 1;
  if (rankIndex <= 0) return "hsl(120 30% 50%)";
  if (rankIndex <= 5) return "hsl(0 80% 45%)"; // red
  if (rankIndex <= 10) return "hsl(0 70% 60%)"; // light red
  if (rankIndex <= 15) return "hsl(330 70% 70%)"; // pink
  if (rankIndex <= 20) return "hsl(90 60% 65%)"; // light green
  return "hsl(120 65% 40%)"; // green
};
