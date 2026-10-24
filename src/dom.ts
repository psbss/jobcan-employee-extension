/*
    This Source Code Form is subject to the terms of the Mozilla Public
    License, v. 2.0. If a copy of the MPL was not distributed with this
    file, You can obtain one at https://mozilla.org/MPL/2.0/.
*/

import { parseDuration } from "./time";
import type { DayRecord, YearMonth } from "./types";

const REQUIRED_LABEL = "月規定労働時間";
const DATE_LABEL = "日付";
const HOLIDAY_LABEL = "休日区分";
const WORK_LABEL = "労働時間";
const MODIFY_LINK_SELECTOR = 'a[href*="/employee/adit/modify"]';

/** 出勤簿の 1 行と、その行から読み取った値 */
export type AttendanceRow = {
	row: HTMLTableRowElement;
	record: DayRecord;
};

export type AttendanceTable = {
	table: HTMLTableElement;
	displayed: YearMonth;
	rows: AttendanceRow[];
};

/** 改行や空白を取り除いた要素のテキスト（"休日<br>区分" → "休日区分"） */
function normalizedText(element: Element): string {
	return (element.textContent ?? "").replace(/\s+/g, "");
}

function headerLabels(table: HTMLTableElement): string[] {
	return Array.from(table.querySelectorAll("thead th"), normalizedText);
}

/** thead に「日付」と「労働時間」の見出しを持つテーブルを出勤簿として探す */
export function findAttendanceTable(doc: Document): HTMLTableElement | null {
	for (const table of doc.querySelectorAll("table")) {
		const labels = headerLabels(table);
		if (labels.includes(DATE_LABEL) && labels.includes(WORK_LABEL)) {
			return table;
		}
	}
	return null;
}

/** 集計情報から月規定労働時間（分）を読む。見つからなければ null */
export function readRequiredMinutes(doc: Document): number | null {
	for (const th of doc.querySelectorAll("table.info-contents th")) {
		if (normalizedText(th) !== REQUIRED_LABEL) {
			continue;
		}
		const value = th.closest("tr")?.querySelector("td .info-content");
		return value ? parseDuration(value.textContent ?? "") : null;
	}
	return null;
}

/**
 * 出勤簿テーブルの各行を読み取る。
 * 年月日は打刻修正リンクのクエリ（year, month, day）から取る。
 * 必要な列やリンクが見つからない場合は null を返す。
 */
export function readAttendanceTable(
	table: HTMLTableElement,
	baseUrl: string,
): AttendanceTable | null {
	const labels = headerLabels(table);
	const holidayIndex = labels.indexOf(HOLIDAY_LABEL);
	const workIndex = labels.indexOf(WORK_LABEL);
	if (holidayIndex < 0 || workIndex < 0) {
		return null;
	}

	let displayed: YearMonth | null = null;
	const rows: AttendanceRow[] = [];
	for (const row of table.querySelectorAll<HTMLTableRowElement>("tbody > tr")) {
		const link = row.querySelector(MODIFY_LINK_SELECTOR);
		const href = link?.getAttribute("href");
		if (!href) {
			continue;
		}
		const params = new URL(href, baseUrl).searchParams;
		const year = Number(params.get("year"));
		const month = Number(params.get("month"));
		const day = Number(params.get("day"));
		if (!year || !month || !day) {
			continue;
		}
		displayed ??= { year, month };

		const holidayCell = row.cells[holidayIndex];
		const workCell = row.cells[workIndex];
		rows.push({
			row,
			record: {
				day,
				isHoliday: holidayCell ? normalizedText(holidayCell) !== "" : false,
				workMinutes: workCell
					? parseDuration(workCell.textContent ?? "")
					: null,
			},
		});
	}

	if (!displayed) {
		return null;
	}
	return { table, displayed, rows };
}
