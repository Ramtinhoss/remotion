export type WaveFormatBox = {
	type: 'wave-format-box';
	formatTag: 1;
	numberOfChannels: number;
	sampleRate: number;
	blockAlign: number;
	byteRate: number;
	bitsPerSample: number;
};

export type RiffRegularBox = {
	type: 'riff-box';
	size: number;
	id: string;
};

export type RiffHeader = {
	type: 'riff-header';
	fileSize: number;
	fileType: string;
};

export type RiffBox = RiffRegularBox | WaveFormatBox | RiffHeader;
