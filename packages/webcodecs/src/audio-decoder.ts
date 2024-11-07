import type {AudioSample, LogLevel} from '@remotion/media-parser';
import {makeIoSynchronizer} from './io-manager/io-synchronizer';

export type WebCodecsAudioDecoder = {
	processSample: (audioSample: AudioSample) => Promise<void>;
	waitForFinish: () => Promise<void>;
	close: () => void;
	flush: () => Promise<void>;
};

export const createAudioDecoder = ({
	onFrame,
	onError,
	signal,
	config,
	logLevel,
}: {
	onFrame: (frame: AudioData) => Promise<void>;
	onError: (error: DOMException) => void;
	signal: AbortSignal;
	config: AudioDecoderConfig;
	logLevel: LogLevel;
}): WebCodecsAudioDecoder => {
	if (signal.aborted) {
		throw new Error('Not creating audio decoder, already aborted');
	}

	const ioSynchronizer = makeIoSynchronizer(logLevel, 'Audio decoder');

	let outputQueue = Promise.resolve();

	const audioDecoder = new AudioDecoder({
		output(inputFrame) {
			ioSynchronizer.onOutput(inputFrame.timestamp);
			outputQueue = outputQueue
				.then(() => onFrame(inputFrame))
				.then(() => {
					ioSynchronizer.onProcessed();
					return Promise.resolve();
				});
		},
		error(error) {
			onError(error);
		},
	});

	const close = () => {
		// eslint-disable-next-line @typescript-eslint/no-use-before-define
		signal.removeEventListener('abort', onAbort);

		if (audioDecoder.state === 'closed') {
			return;
		}

		audioDecoder.close();
	};

	const onAbort = () => {
		close();
	};

	signal.addEventListener('abort', onAbort);

	audioDecoder.configure(config);

	const processSample = async (audioSample: AudioSample) => {
		if (audioDecoder.state === 'closed') {
			return;
		}

		while (ioSynchronizer.getUnemittedKeyframes() > 1) {
			await ioSynchronizer.waitForOutput();
		}

		// Don't flush, it messes up the audio

		const chunk = new EncodedAudioChunk(audioSample);
		audioDecoder.decode(chunk);
		ioSynchronizer.inputItem(chunk.timestamp, audioSample.type === 'key');
	};

	let queue = Promise.resolve();

	return {
		processSample: (sample: AudioSample) => {
			queue = queue.then(() => processSample(sample));
			return queue;
		},
		waitForFinish: async () => {
			await audioDecoder.flush();
			await ioSynchronizer.waitForFinish();
			await outputQueue;
		},
		close,
		flush: async () => {
			await audioDecoder.flush();
		},
	};
};
