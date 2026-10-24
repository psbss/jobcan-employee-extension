/*
    This Source Code Form is subject to the terms of the Mozilla Public
    License, v. 2.0. If a copy of the MPL was not distributed with this
    file, You can obtain one at https://mozilla.org/MPL/2.0/.
*/

import type { DayRecord, DayResult, YearMonth, YearMonthDay } from "./types";

/**
 * 表示中の月のうち、何日まで結果を表示するかを返す。
 * 過去の月は全日、当月は今日まで、未来の月は 0（何も表示しない）。
 */
export function lastVisibleDay(
	displayed: YearMonth,
	today: YearMonthDay,
): number {
	const displayedIndex = displayed.year * 12 + displayed.month;
	const todayIndex = today.year * 12 + today.month;
	if (displayedIndex < todayIndex) {
		return Number.POSITIVE_INFINITY;
	}
	if (displayedIndex > todayIndex) {
		return 0;
	}
	return today.day;
}

/**
 * 行ごとに累計・残り時間を計算する。残り勤務日数と 1 日平均は今日の行だけ計算する。
 *
 * - 残り勤務日数は、今日より後の休日でない日の数。
 * - ただし今日が勤務日で労働時間がまだ空（勤務中・未打刻）の場合は、今日自身も含める。
 *
 * @param records 出勤簿の行（日付順）
 * @param requiredMinutes 月規定労働時間（分）。不明なら null
 * @param displayed 表示中の年月
 * @param today 今日の日付（ローカル）
 */
export function calculate(
	records: readonly DayRecord[],
	requiredMinutes: number | null,
	displayed: YearMonth,
	today: YearMonthDay,
): DayResult[] {
	const lastDay = lastVisibleDay(displayed, today);
	const isCurrentMonth =
		displayed.year === today.year && displayed.month === today.month;

	// workDaysAfter[i] = i より後の勤務日数
	const workDaysAfter = new Array<number>(records.length).fill(0);
	for (let i = records.length - 2; i >= 0; i--) {
		const next = records[i + 1];
		workDaysAfter[i] =
			(workDaysAfter[i + 1] ?? 0) + (next && !next.isHoliday ? 1 : 0);
	}

	let cumulative = 0;
	return records.map((record, i) => {
		cumulative += record.workMinutes ?? 0;

		if (record.day > lastDay) {
			return {
				day: record.day,
				visible: false,
				isToday: false,
				cumulativeMinutes: null,
				remainingMinutes: null,
				remainingWorkDays: null,
				averageMinutes: null,
			};
		}

		const isToday = isCurrentMonth && record.day === today.day;
		const remainingMinutes =
			requiredMinutes === null ? null : requiredMinutes - cumulative;
		if (!isToday) {
			return {
				day: record.day,
				visible: true,
				isToday,
				cumulativeMinutes: cumulative,
				remainingMinutes,
				remainingWorkDays: null,
				averageMinutes: null,
			};
		}

		const includesToday = !record.isHoliday && record.workMinutes === null;
		const remainingWorkDays = (workDaysAfter[i] ?? 0) + (includesToday ? 1 : 0);
		return {
			day: record.day,
			visible: true,
			isToday,
			cumulativeMinutes: cumulative,
			remainingMinutes,
			remainingWorkDays,
			averageMinutes: average(remainingMinutes, remainingWorkDays),
		};
	});
}

function average(
	remainingMinutes: number | null,
	remainingWorkDays: number,
): number | null {
	if (
		remainingMinutes === null ||
		remainingMinutes <= 0 ||
		remainingWorkDays === 0
	) {
		return null;
	}
	return Math.ceil(remainingMinutes / remainingWorkDays);
}
