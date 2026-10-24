/*
    This Source Code Form is subject to the terms of the Mozilla Public
    License, v. 2.0. If a copy of the MPL was not distributed with this
    file, You can obtain one at https://mozilla.org/MPL/2.0/.
*/

/** 出勤簿の 1 日分の入力 */
export type DayRecord = {
	/** 月内の日（1〜31） */
	day: number;
	/** 休日区分が空でなければ true */
	isHoliday: boolean;
	/** 労働時間（分）。未入力は null */
	workMinutes: number | null;
};

/** 出勤簿の 1 日分の計算結果 */
export type DayResult = {
	day: number;
	/** 表示しない行（未来の日付）は false。以降の値はすべて null */
	visible: boolean;
	/** 今日の行なら true */
	isToday: boolean;
	/** 1 日からその日までの労働時間の合計（分） */
	cumulativeMinutes: number | null;
	/** 月規定労働時間 - 累計（分）。負の値は超過。規定時間が不明なら null */
	remainingMinutes: number | null;
	/** 残りの勤務日数。今日の行以外は null */
	remainingWorkDays: number | null;
	/** 1 日平均（分、切り上げ）。今日の行以外、残り勤務日数 0、残りが 0 以下のときは null */
	averageMinutes: number | null;
};

/** 年月日（月は 1〜12） */
export type YearMonthDay = {
	year: number;
	month: number;
	day: number;
};

/** 年月（月は 1〜12） */
export type YearMonth = Omit<YearMonthDay, "day">;
