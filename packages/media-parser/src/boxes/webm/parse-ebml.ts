import type {BufferIterator} from '../../buffer-iterator';
import type {
	EbmlWithString,
	EbmlWithUint8,
	EbmlWithVoid,
} from './segments/all-segments';
import {ebmlMap, type Ebml, type EbmlParsed} from './segments/all-segments';

type Prettify<T> = {
	[K in keyof T]: T[K];
} & {};

export const parseEbml = (
	iterator: BufferIterator,
): Prettify<EbmlParsed<Ebml>> => {
	const hex = iterator.getMatroskaSegmentId();

	const hasInMap = ebmlMap[hex as keyof typeof ebmlMap];
	if (!hasInMap) {
		throw new Error(
			`Don't know how to parse EBML hex ID ${JSON.stringify(hex)}`,
		);
	}

	const size = iterator.getVint();

	if (hasInMap.type === 'uint-8') {
		const value = iterator.getUint8();

		return {type: hasInMap.name, value, hex} as EbmlParsed<EbmlWithUint8>;
	}

	if (hasInMap.type === 'string') {
		const value = iterator.getByteString(size);

		return {
			type: hasInMap.name,
			value,
			hex,
		} as EbmlParsed<EbmlWithString>;
	}

	if (hasInMap.type === 'void') {
		iterator.discard(size);

		return {
			type: hasInMap.name,
			value: undefined,
			hex,
		} as EbmlParsed<EbmlWithVoid>;
	}

	if (hasInMap.type === 'children') {
		const children: EbmlParsed<Ebml>[] = [];
		const startOffset = iterator.counter.getOffset();

		// eslint-disable-next-line no-constant-condition
		while (true) {
			const value = parseEbml(iterator);
			children.push(value);
			const offsetNow = iterator.counter.getOffset();

			if (offsetNow - startOffset > size) {
				throw new Error(
					`Offset ${offsetNow - startOffset} is larger than the length of the hex ${size}`,
				);
			}

			if (offsetNow - startOffset === size) {
				break;
			}
		}

		return {type: hasInMap.name, value: children as EbmlParsed<Ebml>[], hex};
	}

	// @ts-expect-error
	throw new Error(`Unknown segment type ${hasInMap.type}`);
};
