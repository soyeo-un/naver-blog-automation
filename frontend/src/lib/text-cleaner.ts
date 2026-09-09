const INVISIBLE_REGEX =
  /[\u00AD\u034F\u061C\u115F\u1160\u17B4\u17B5\u180E\u200B-\u200F\u202A-\u202E\u2060-\u2064\u2066-\u206F\u3164\uFE00-\uFE0F\uFEFF\uFFA0]/g;

/**
 * Frontend 2nd-pass cleaning: removes invisible/zero-width characters
 */
export function cleanTextLocal(text: string): string {
  return text.replace(INVISIBLE_REGEX, "");
}

/**
 * Scan text for invisible characters and return their positions
 */
export function scanTextLocal(text: string) {
  const positions: Array<{ index: number; charCode: string }> = [];
  for (let i = 0; i < text.length; i++) {
    if (INVISIBLE_REGEX.test(text[i])) {
      positions.push({
        index: i,
        charCode: `U+${text.charCodeAt(i).toString(16).toUpperCase().padStart(4, "0")}`,
      });
    }
    INVISIBLE_REGEX.lastIndex = 0;
  }
  return {
    isClean: positions.length === 0,
    totalHidden: positions.length,
    positions,
  };
}

/**
 * Mapping of invisible character codes to readable names (Korean)
 */
export const INVISIBLE_CHAR_NAMES: Record<string, string> = {
  "U+00AD": "소프트 하이픈",
  "U+034F": "조합 문자",
  "U+061C": "아랍어 마크",
  "U+200B": "영폭 공백",
  "U+200C": "영폭 비결합자",
  "U+200D": "영폭 결합자",
  "U+200E": "좌→우 마크",
  "U+200F": "우→좌 마크",
  "U+2060": "워드조이너",
  "U+FEFF": "BOM / 영폭 비분리 공백",
  "U+FE0F": "변형 선택자",
};
