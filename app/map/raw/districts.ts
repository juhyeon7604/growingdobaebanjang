export const seoulDistricts = [
  "강서구",
  "양천구",
  "구로구",
  "금천구",
  "영등포구",
  "동작구",
  "관악구",
  "서초구",
  "강남구",
  "송파구",
  "강동구",
  "광진구",
  "성동구",
  "중구",
  "용산구",
  "마포구",
  "서대문구",
  "종로구",
  "성북구",
  "동대문구",
  "중랑구",
  "노원구",
  "도봉구",
  "강북구",
  "은평구",
] as const;

export const districtPositions: Record<string, { top: string; left: string }> = {
  도봉구: { top: "10%", left: "64%" },
  노원구: { top: "16%", left: "72%" },
  강북구: { top: "20%", left: "60%" },
  은평구: { top: "25%", left: "44%" },
  성북구: { top: "32%", left: "62%" },
  종로구: { top: "39%", left: "54%" },
  중구: { top: "45.5%", left: "55%" },
  동대문구: { top: "39%", left: "68%" },
  중랑구: { top: "34%", left: "76%" },
  서대문구: { top: "39.5%", left: "44.5%" },
  마포구: { top: "46%", left: "40%" },
  용산구: { top: "53%", left: "53%" },
  성동구: { top: "49%", left: "65.5%" },
  광진구: { top: "50%", left: "75%" },
  강동구: { top: "48%", left: "86.7%" },
  강서구: { top: "44%", left: "21%" },
  양천구: { top: "58%", left: "28%" },
  구로구: { top: "66%", left: "26%" },
  금천구: { top: "74%", left: "35.5%" },
  영등포구: { top: "58%", left: "38%" },
  동작구: { top: "64%", left: "46%" },
  관악구: { top: "77%", left: "46.5%" },
  서초구: { top: "70%", left: "59%" },
  강남구: { top: "68%", left: "68%" },
  송파구: { top: "63%", left: "78.5%" },
};

export const MAP_LABEL_OFFSET_X = -3;
export const MAP_LABEL_OFFSET_Y = 10;

export const getDistrictPosition = (district: string) => {
  const pos = districtPositions[district] ?? { top: "50%", left: "50%" };
  return {
    top: `calc(${pos.top} + ${MAP_LABEL_OFFSET_Y}%)`,
    left: `calc(${pos.left} + ${MAP_LABEL_OFFSET_X}%)`,
  };
};
