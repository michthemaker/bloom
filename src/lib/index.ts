export function last<T>(value: T[]): T;

export function last(value: string): string;

export function last<T>(value: T[] | string) {
	return value[value.length - 1];
}

export function first<T>(value: T[]): T;

export function first(value: string): string;

export function first<T>(value: T[] | string) {
	return value[0];
}

type CaseArray<C, R> = [C, R];

/**
 * @dev take this as an inline switch
 * @param check value to check
 * @param cases the cases to check against
 * @returns the return value of the case that matches the check
 */
export function inlineSwitch<
	Return,
	Check = any,
	Case extends Check | Check[] = any,
	Default extends { default: Return } | undefined = undefined
>(check: Check, ...cases: Array<CaseArray<Case, Return> | Default>) {
	let pickedReturn: Return | undefined = undefined;
	// separate the default case objects from the and return the a destructured array of [defaultCases, caseArrays]
	const [defaultCases, caseArrays] = cases.reduce(
		(acc, caseArray) => {
			if (Array.isArray(caseArray)) {
				acc[1].push(caseArray);
			} else {
				acc[0].push(caseArray);
			}
			return acc;
		},
		[[], []] as [Default[], CaseArray<Case, Return>[]]
	);

	for (let i = 0; i < caseArrays.length; i++) {
		let [caseValue, returnValue] = caseArrays[i] || [];
		let actualCaseValue = Array.isArray(caseValue)
			? (caseValue as Check[])
			: ([caseValue] as Check[]);
		if (actualCaseValue.includes(check)) {
			pickedReturn = returnValue;
			break;
		}
	}
	if (pickedReturn === undefined && defaultCases.length > 0)
		pickedReturn = last(defaultCases)?.default;
	return pickedReturn as Default extends { default: Return } ? Return : undefined;
}
