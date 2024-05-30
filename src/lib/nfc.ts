let ndef: any = null;
try {
// @ts-ignore
	ndef = new NDEFReader();
} catch {
	document.documentElement.classList.add('ndef-disabled');
}

interface NDEFRecord {
	recordType: string;
	data: AllowSharedBufferSource;
	encoding: string;
	toRecords(): Iterable<NDEFRecord>;
}

function expandRecord(parent: NDEFRecord): Record<string, any> {
	try {
		const result = {};
		for (const child of parent.toRecords()) {
			const data = expandRecord(child);
			for (let [key, value] of Object.entries(data)) {
				result[key] = (key in result)
					? [result[key], value].flat()
					: result[key] = value;
			}
		}
		return result;
	} catch {
		const { recordType, data, encoding } = parent;
		return { 
			[recordType]: new TextDecoder(encoding).decode(data)
		};
	}
}

export async function getData(signal: AbortSignal): Promise<any> {
	return await new Promise(async (resolve, reject) => {
		try {
			await ndef.scan({ signal });
			// @ts-ignore
			ndef.addEventListener('reading', ({ message }) => {
				resolve(
					Array.from(message.records)
						.map(expandRecord)
						.reduce<Record<string, any>>((obj, expanded) => Object.assign(obj, expanded), {})
				);
			});
		} catch(error) {
			reject(error);
		}
	});
}