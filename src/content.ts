import { calculate } from "./calc";
import {
	findAttendanceTable,
	readAttendanceTable,
	readRequiredMinutes,
} from "./dom";
import { formatDuration } from "./time";
import type { DayResult, YearMonthDay } from "./types";

const LOG_PREFIX = "[jobcan-ext]";
const ADDED_ATTR = "data-jce-added";
/** 1 日平均がこれを超えたら強調する（分） */
const AVERAGE_WARNING_MINUTES = 8 * 60;

function main(): void {
	const table = findAttendanceTable(document);
	if (!table) {
		console.warn(LOG_PREFIX, "出勤簿テーブルが見つかりません");
		return;
	}
	if (table.querySelector(`[${ADDED_ATTR}]`)) {
		return;
	}

	const attendance = readAttendanceTable(table, document.baseURI);
	if (!attendance) {
		console.warn(LOG_PREFIX, "出勤簿テーブルの列または日付を読み取れません");
		return;
	}

	const requiredMinutes = readRequiredMinutes(document);
	const records = attendance.rows.map(({ record }) => record);
	const results = calculate(
		records,
		requiredMinutes,
		attendance.displayed,
		localToday(),
	);

	appendHeader(table, requiredMinutes !== null);
	attendance.rows.forEach(({ row }, i) => {
		const result = results[i];
		if (result) {
			appendDayCells(row, result);
		}
	});
	appendFooter(table);
}

function localToday(): YearMonthDay {
	const now = new Date();
	return {
		year: now.getFullYear(),
		month: now.getMonth() + 1,
		day: now.getDate(),
	};
}

function createCell<K extends "th" | "td">(
	tag: K,
	className: string,
): HTMLElementTagNameMap[K] {
	const cell = document.createElement(tag);
	cell.className = className;
	cell.setAttribute(ADDED_ATTR, "");
	return cell;
}

function line(text: string, className?: string): HTMLDivElement {
	const div = document.createElement("div");
	div.textContent = text;
	if (className) {
		div.className = className;
	}
	return div;
}

function appendHeader(table: HTMLTableElement, hasRequired: boolean): void {
	const headerRow = table.tHead?.rows[0];
	if (!headerRow) {
		return;
	}
	const cumulative = createCell("th", "text-wrap jce-col");
	cumulative.scope = "col";
	cumulative.textContent = "累計労働時間";

	const remaining = createCell("th", "text-wrap jce-col");
	remaining.scope = "col";
	remaining.textContent = "残時間 / 残平均";
	if (!hasRequired) {
		remaining.title = "月規定労働時間が取得できません";
	}
	headerRow.append(cumulative, remaining);
}

/** 残り時間と 1 日平均の表示（2 行） */
function remainingLines(
	remainingMinutes: number | null,
	averageMinutes: number | null,
	remainingWorkDays: number | null,
): HTMLDivElement[] {
	if (remainingMinutes === null) {
		return [];
	}
	if (remainingMinutes === 0) {
		return [line("達成", "jce-over")];
	}
	if (remainingMinutes < 0) {
		return [line(`超過 +${formatDuration(-remainingMinutes)}`, "jce-over")];
	}
	const lines = [line(`残 ${formatDuration(remainingMinutes)}`)];
	if (remainingWorkDays === null) {
		return lines;
	}
	if (averageMinutes === null) {
		lines.push(line("平均 —"));
	} else {
		lines.push(
			line(
				`平均 ${formatDuration(averageMinutes)}`,
				averageMinutes > AVERAGE_WARNING_MINUTES ? "jce-warn" : undefined,
			),
		);
	}
	return lines;
}

function appendDayCells(row: HTMLTableRowElement, result: DayResult): void {
	const cumulative = createCell("td", "jce-col");
	const remaining = createCell("td", "jce-col");
	if (result.visible && result.cumulativeMinutes !== null) {
		cumulative.textContent = formatDuration(result.cumulativeMinutes);
		remaining.append(
			...remainingLines(
				result.remainingMinutes,
				result.averageMinutes,
				result.remainingWorkDays,
			),
		);
		if (result.remainingWorkDays !== null) {
			remaining.title = `残り勤務日数: ${result.remainingWorkDays}日`;
		}
	}
	row.append(cumulative, remaining);
}

/** 合計行は列数を揃えるための空セルだけ追加する */
function appendFooter(table: HTMLTableElement): void {
	const footerRow = table.tFoot?.rows[0];
	if (!footerRow) {
		return;
	}
	footerRow.append(createCell("td", "jce-col"), createCell("td", "jce-col"));
}

try {
	main();
} catch (error) {
	console.warn(LOG_PREFIX, "表示に失敗しました", error);
}
