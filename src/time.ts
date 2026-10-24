/*
    This Source Code Form is subject to the terms of the Mozilla Public
    License, v. 2.0. If a copy of the MPL was not distributed with this
    file, You can obtain one at https://mozilla.org/MPL/2.0/.
*/

const TIME_PATTERN = /^(\d+):([0-5]\d)$/;

/**
 * "HH:MM" 形式（時間は 3 桁以上も可）を分に変換する。
 * 空文字や形式が合わない場合は null を返す。
 */
export function parseDuration(text: string): number | null {
	const match = TIME_PATTERN.exec(text.trim());
	if (!match) {
		return null;
	}
	const [, hours, minutes] = match;
	return Number(hours) * 60 + Number(minutes);
}

/**
 * 分を "H:MM" 形式にする（時間はゼロ埋めしない、分は 2 桁）。
 * 負の値は先頭に "-" を付ける。端数は絶対値を切り上げる。
 */
export function formatDuration(minutes: number): string {
	const sign = minutes < 0 ? "-" : "";
	const abs = Math.ceil(Math.abs(minutes));
	const hours = Math.floor(abs / 60);
	const rest = abs % 60;
	return `${sign}${hours}:${String(rest).padStart(2, "0")}`;
}
