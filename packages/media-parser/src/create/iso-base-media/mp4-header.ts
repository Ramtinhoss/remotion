import {createIlst} from './create-ilst';
import {createMoov} from './create-moov';
import {createMvhd} from './create-mvhd';
import {createUdta} from './create-udta';
import {createCmt} from './ilst/create-cmt';
import {createToo} from './ilst/create-too';
import {IDENTITY_MATRIX, padIsoBaseMediaBytes} from './primitives';
import type {IsoBaseMediaTrackData} from './serialize-track';
import {ISO_BASE_TIMESCALE, serializeTrack} from './serialize-track';
import {createMeta} from './udta/create-meta';
import {createHdlr} from './udta/meta/create-hdlr';

const HEADER_LENGTH = 8196;

export const createPaddedMoovAtom = ({
	durationInUnits,
	trackInfo,
}: {
	durationInUnits: number;
	trackInfo: IsoBaseMediaTrackData[];
}) => {
	return padIsoBaseMediaBytes(
		createMoov({
			mvhd: createMvhd({
				timescale: ISO_BASE_TIMESCALE,
				durationInUnits,
				matrix: IDENTITY_MATRIX,
				nextTrackId:
					trackInfo
						.map((t) => t.track.trackNumber)
						.reduce((a, b) => Math.max(a, b), 0) + 1,
				rate: 1,
				volume: 1,
			}),
			traks: trackInfo.map((track) => serializeTrack(track)),
			udta: createUdta(
				createMeta({
					hdlr: createHdlr('mdir'),
					ilst: createIlst([
						// TODO: Make browser name dynamic
						createToo('Google Chrome'),
						createCmt('Made with @remotion/webcodecs'),
					]),
				}),
			),
		}),
		HEADER_LENGTH,
	);
};
