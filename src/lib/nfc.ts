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
		return { [parent.recordType]: result };
	} catch {
		const { recordType, data, encoding } = parent;
		return { 
			[recordType]: new TextDecoder(encoding ?? 'utf-8').decode(data)
		};
	}
}

export function getData(signal?: AbortSignal): Promise<any> {
	return new Promise(async (resolve, reject) => {
		try {
			await ndef.scan({ signal });
			ndef.addEventListener('reading', ({ message }) => {
				resolve(
					Array.from(message.records)
						.map(expandRecord)
						.reduce<Record<string, any>>((obj, expanded) => Object.assign(obj, expanded), {})
					);
			});
		} catch(err) {
			reject(err);
		}
	});
}