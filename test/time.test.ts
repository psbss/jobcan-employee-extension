import { describe, expect, it } from "vitest";
import { formatDuration, parseDuration } from "../src/time";

describe("parseDuration", () => {
	it("HH:MM を分に変換する", () => {
		expect(parseDuration("06:35")).toBe(395);
		expect(parseDuration("00:00")).toBe(0);
	});

	it("時間の桁数は問わない", () => {
		expect(parseDuration("1:05")).toBe(65);
		expect(parseDuration("118:50")).toBe(7130);
	});

	it("前後の空白は無視する", () => {
		expect(parseDuration("  07:05\n")).toBe(425);
	});

	it("空文字や形式不一致は null", () => {
		expect(parseDuration("")).toBeNull();
		expect(parseDuration("--:--")).toBeNull();
		expect(parseDuration("7:60")).toBeNull();
		expect(parseDuration("07:5")).toBeNull();
		expect(parseDuration("11:00～16:00")).toBeNull();
	});
});

describe("formatDuration", () => {
	it("H:MM 形式にする（時間はゼロ埋めしない）", () => {
		expect(formatDuration(0)).toBe("0:00");
		expect(formatDuration(59)).toBe("0:59");
		expect(formatDuration(60)).toBe("1:00");
		expect(formatDuration(395)).toBe("6:35");
	});

	it("100 時間以上も扱う", () => {
		expect(formatDuration(6000)).toBe("100:00");
		expect(formatDuration(10080)).toBe("168:00");
	});

	it("負の値は - を付ける", () => {
		expect(formatDuration(-90)).toBe("-1:30");
	});

	it("端数は切り上げる", () => {
		expect(formatDuration(59.2)).toBe("1:00");
		expect(formatDuration(-0.5)).toBe("-0:01");
	});
});
