import type {Track} from '../../get-tracks';
import type {ParserContext} from '../../parser-context';
import {registerTrack} from '../../register-track';
import type {AudioOrVideoSample} from '../../webcodec-sample-types';
import {getAvccBoxContent} from '../avc/codec-private';
import {getCodecStringFromSpsAndPps} from '../avc/codec-string';
import {
	getDimensionsFromSps,
	getSampleAspectRatioFromSps,
	getVideoColorFromSps,
} from '../avc/interpret-sps';
import {getKeyFrameOrDeltaFromAvcInfo} from '../avc/key';
import {parseAvc} from '../avc/parse-avc';
import {getSpsAndPps} from '../avc/sps-and-pps';
import type {TransportStreamPacketBuffer} from './process-stream-buffers';

export const handleAvcPacket = async ({
	streamBuffer,
	programId,
	options,
}: {
	streamBuffer: TransportStreamPacketBuffer;
	programId: number;
	options: ParserContext;
}) => {
	const avc = parseAvc(streamBuffer.buffer);
	const isTrackRegistered = options.parserState.tracks.getTracks().find((t) => {
		return t.trackId === programId;
	});

	if (!isTrackRegistered) {
		const spsAndPps = getSpsAndPps(avc);
		const dimensions = getDimensionsFromSps(spsAndPps.sps.spsData);
		const sampleAspectRatio = getSampleAspectRatioFromSps(
			spsAndPps.sps.spsData,
		);

		const track: Track = {
			rotation: 0,
			trackId: programId,
			type: 'video',
			timescale: 90000,
			codec: getCodecStringFromSpsAndPps(spsAndPps.sps),
			codecPrivate: getAvccBoxContent(spsAndPps),
			fps: null,
			codedWidth: dimensions.width,
			codedHeight: dimensions.height,
			height: dimensions.height,
			width: dimensions.width,
			displayAspectWidth: dimensions.width,
			displayAspectHeight: dimensions.height,
			trakBox: null,
			codecWithoutConfig: 'h264',
			description: undefined,
			sampleAspectRatio: {
				denominator: sampleAspectRatio.height,
				numerator: sampleAspectRatio.width,
			},
			color: getVideoColorFromSps(spsAndPps.sps.spsData),
		};

		await registerTrack({track, options});
	}

	const sample: AudioOrVideoSample = {
		cts: streamBuffer.pesHeader.pts,
		dts: streamBuffer.pesHeader.dts ?? streamBuffer.pesHeader.pts,
		timestamp: streamBuffer.pesHeader.pts,
		duration: undefined,
		data: new Uint8Array(streamBuffer.buffer),
		trackId: programId,
		type: getKeyFrameOrDeltaFromAvcInfo(avc),
	};

	await options.parserState.onVideoSample(programId, sample);
};
