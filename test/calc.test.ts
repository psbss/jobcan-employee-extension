import { describe, expect, it } from "vitest";
import { calculate, lastVisibleDay } from "../src/calc";
import type { DayRecord } from "../src/types";

const H = 60;

/** 架空の 1 週間分（1〜7 日、6・7 日が休日） */
function week(): DayRecord[] {
	return [
		{ day: 1, isHoliday: false, workMinutes: 8 * H },
		{ day: 2, isHoliday: false, workMinutes: 7 * H + 30 },
		{ day: 3, isHoliday: false, workMinutes: null },
		{ day: 4, isHoliday: false, workMinutes: 9 * H },
		{ day: 5, isHoliday: false, workMinutes: null },
		{ day: 6, isHoliday: true, workMinutes: null },
		{ day: 7, isHoliday: true, workMinutes: null },
	];
}

const displayed = { year: 2030, month: 4 };
const pastToday = { year: 2030, month: 5, day: 10 };

describe("lastVisibleDay", () => {
	it("過去の月は全日", () => {
		expect(lastVisibleDay(displayed, pastToday)).toBe(Number.POSITIVE_INFINITY);
		expect(lastVisibleDay(displayed, { year: 2031, month: 1, day: 1 })).toBe(
			Number.POSITIVE_INFINITY,
		);
	});

	it("当月は今日まで", () => {
		expect(lastVisibleDay(displayed, { year: 2030, month: 4, day: 3 })).toBe(3);
	});

	it("未来の月は 0", () => {
		expect(lastVisibleDay(displayed, { year: 2030, month: 3, day: 31 })).toBe(
			0,
		);
		expect(lastVisibleDay(displayed, { year: 2029, month: 12, day: 1 })).toBe(
			0,
		);
	});
});

describe("calculate", () => {
	it("空セルを 0 として累計する", () => {
		const results = calculate(week(), 40 * H, displayed, pastToday);
		expect(results.map((r) => r.cumulativeMinutes)).toEqual([
			480, 930, 930, 1470, 1470, 1470, 1470,
		]);
	});

	it("残り時間は規定 - 累計", () => {
		const results = calculate(week(), 40 * H, displayed, pastToday);
		expect(results[0]?.remainingMinutes).toBe(40 * H - 480);
		expect(results[6]?.remainingMinutes).toBe(40 * H - 1470);
	});

	it("今日以外の行は残り勤務日数と 1 日平均を持たない", () => {
		const today = { year: 2030, month: 4, day: 4 };
		const results = calculate(week(), 40 * H, displayed, today);
		for (const r of results.filter((r) => r.day !== 4)) {
			expect(r.isToday).toBe(false);
			expect(r.remainingWorkDays).toBeNull();
			expect(r.averageMinutes).toBeNull();
		}
		expect(results[3]?.isToday).toBe(true);
	});

	it("過去の月は全行に累計と残りを出し、1 日平均はどの行にも出さない", () => {
		const results = calculate(week(), 40 * H, displayed, pastToday);
		expect(results.every((r) => r.visible)).toBe(true);
		expect(results.some((r) => r.isToday)).toBe(false);
		expect(results.every((r) => r.averageMinutes === null)).toBe(true);
		expect(results.every((r) => r.remainingMinutes !== null)).toBe(true);
	});

	it("残り勤務日数は今日より後の休日でない日の数（休日を挟む）", () => {
		const records: DayRecord[] = [
			{ day: 1, isHoliday: false, workMinutes: 8 * H },
			{ day: 2, isHoliday: true, workMinutes: null },
			{ day: 3, isHoliday: false, workMinutes: 8 * H },
			{ day: 4, isHoliday: true, workMinutes: null },
			{ day: 5, isHoliday: false, workMinutes: 8 * H },
		];
		const remainingOn = (day: number) =>
			calculate(records, 40 * H, displayed, { ...displayed, day })[day - 1]
				?.remainingWorkDays;
		expect([1, 2, 3, 4, 5].map(remainingOn)).toEqual([2, 2, 1, 1, 0]);
	});

	it("1 日平均は残り時間 ÷ 残り勤務日数を分単位で切り上げる", () => {
		const day2 = calculate(week(), 40 * H, displayed, { ...displayed, day: 2 });
		expect(day2[1]?.remainingWorkDays).toBe(3);
		// 2 日終了時点: 残り 2400 - 930 = 1470 分を 3・4・5 日の 3 日で割る → 490
		expect(day2[1]?.averageMinutes).toBe(490);

		const ceil = calculate(
			[
				{ day: 1, isHoliday: false, workMinutes: 0 },
				{ day: 2, isHoliday: false, workMinutes: null },
				{ day: 3, isHoliday: false, workMinutes: null },
				{ day: 4, isHoliday: false, workMinutes: null },
			],
			100,
			displayed,
			{ ...displayed, day: 1 },
		);
		// 100 / 3 = 33.33… → 34
		expect(ceil[0]?.averageMinutes).toBe(34);
	});

	it("月末（残り勤務日数 0）は平均なし", () => {
		const results = calculate(week(), 40 * H, displayed, {
			...displayed,
			day: 7,
		});
		const last = results[6];
		expect(last?.remainingWorkDays).toBe(0);
		expect(last?.remainingMinutes).toBeGreaterThan(0);
		expect(last?.averageMinutes).toBeNull();
	});

	it("規定時間を超えたら残りは負、平均はなし", () => {
		const results = calculate(week(), 20 * H, displayed, {
			...displayed,
			day: 4,
		});
		expect(results[3]?.remainingMinutes).toBe(20 * H - 1470);
		expect(results[3]?.averageMinutes).toBeNull();
	});

	it("残りがちょうど 0 なら平均はなし", () => {
		const results = calculate(week(), 1470, displayed, {
			...displayed,
			day: 4,
		});
		expect(results[3]?.remainingMinutes).toBe(0);
		expect(results[3]?.averageMinutes).toBeNull();
	});

	it("規定時間が不明なら累計だけ計算する", () => {
		const results = calculate(week(), null, displayed, {
			...displayed,
			day: 2,
		});
		expect(results[1]?.cumulativeMinutes).toBe(930);
		expect(results[1]?.remainingMinutes).toBeNull();
		expect(results[1]?.averageMinutes).toBeNull();
	});

	it("当月は今日より後の行を表示しない", () => {
		const today = { year: 2030, month: 4, day: 4 };
		const results = calculate(week(), 40 * H, displayed, today);
		expect(results.map((r) => r.visible)).toEqual([
			true,
			true,
			true,
			true,
			false,
			false,
			false,
		]);
		expect(results[4]?.cumulativeMinutes).toBeNull();
		expect(results[4]?.remainingMinutes).toBeNull();
		expect(results[4]?.averageMinutes).toBeNull();
	});

	it("今日が勤務日で労働時間が空なら、残り勤務日数に今日を含める", () => {
		const today = { year: 2030, month: 4, day: 3 };
		const results = calculate(week(), 40 * H, displayed, today);
		const row = results[2];
		// 3 日（今日）+ 4・5 日
		expect(row?.remainingWorkDays).toBe(3);
		expect(row?.remainingMinutes).toBe(40 * H - 930);
		expect(row?.averageMinutes).toBe(490);
	});

	it("今日の労働時間が入っていれば今日は含めない", () => {
		const today = { year: 2030, month: 4, day: 4 };
		const results = calculate(week(), 40 * H, displayed, today);
		// 5 日だけ
		expect(results[3]?.remainingWorkDays).toBe(1);
	});

	it("今日が休日なら今日は含めない", () => {
		const today = { year: 2030, month: 4, day: 6 };
		const results = calculate(week(), 40 * H, displayed, today);
		expect(results[5]?.remainingWorkDays).toBe(0);
	});

	it("未来の月は何も表示しない", () => {
		const today = { year: 2030, month: 3, day: 20 };
		const results = calculate(week(), 40 * H, displayed, today);
		expect(results.some((r) => r.visible)).toBe(false);
	});
});
