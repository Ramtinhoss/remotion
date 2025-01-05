import {openBrowser} from '@remotion/renderer';
import type {GetBrowserInstance, ProviderSpecifics} from '@remotion/serverless';
import {Readable} from 'stream';
import {estimatePrice} from '../api/estimate-price';
import {speculateFunctionName} from '../client';
import {MAX_EPHEMERAL_STORAGE_IN_MB} from '../defaults';
import type {AwsProvider} from '../functions/aws-implementation';
import {convertToServeUrlImplementation} from '../shared/convert-to-serve-url';
import {
	getCloudwatchMethodUrl,
	getCloudwatchRendererUrl,
} from '../shared/get-aws-urls';
import {isFlakyError} from '../shared/is-flaky-error';
import {
	getMockCallFunctionAsync,
	getMockCallFunctionStreaming,
	getMockCallFunctionSync,
} from './mocks/aws-clients';
import {
	addMockBucket,
	getMockBuckets,
	getS3FilesInBucket,
	mockBucketExists,
	mockDeleteS3File,
	readMockS3File,
	writeMockS3File,
} from './mocks/mock-store';

type Await<T> = T extends PromiseLike<infer U> ? U : T;
let _browserInstance: Await<ReturnType<typeof openBrowser>> | null;

export const getBrowserInstance: GetBrowserInstance = async () => {
	_browserInstance = await openBrowser('chrome');
	return {instance: _browserInstance, configurationString: 'chrome'};
};

export const mockImplementation: ProviderSpecifics<AwsProvider> = {
	applyLifeCycle: () => Promise.resolve(),
	getChromiumPath() {
		return null;
	},
	getEphemeralStorageForPriceCalculation: () => MAX_EPHEMERAL_STORAGE_IN_MB,
	getLoggingUrlForMethod: getCloudwatchMethodUrl,
	getLoggingUrlForRendererFunction: getCloudwatchRendererUrl,
	getCurrentRegionInFunction: () => 'eu-central-1',
	createBucket: (input) => {
		addMockBucket({
			region: input.region,
			creationDate: 0,
			name: input.bucketName,
		});
		return Promise.resolve();
	},
	getBuckets: () => Promise.resolve(getMockBuckets()),
	listObjects: (input) => {
		if (!input) {
			throw new Error('need to pass input');
		}

		const files = getS3FilesInBucket({
			bucketName: input.bucketName,
			region: input.region,
		});

		return Promise.resolve(
			files
				.filter((p) => p.key.startsWith(input.prefix))
				.map((file) => {
					const size =
						typeof file.content === 'string' ? file.content.length : 0;
					return {
						Key: file.key,
						ETag: 'etag',
						LastModified: new Date(0),
						Owner: undefined,
						Size: size,
						StorageClass: undefined,
					};
				}),
		);
	},
	deleteFile: ({bucketName, key, region}) => {
		mockDeleteS3File({
			bucketName,
			key,
			region,
		});
		return Promise.resolve();
	},
	bucketExists: ({bucketName, region}) => {
		return Promise.resolve(mockBucketExists(bucketName, region));
	},
	randomHash: () => 'abcdef',
	readFile: ({bucketName, key, region}) => {
		const file = readMockS3File({region, key, bucketName});
		if (!file) {
			throw new Error(`no file ${key}`);
		}

		if (typeof file.content === 'string') {
			return Promise.resolve(Readable.from(Buffer.from(file.content)));
		}

		return Promise.resolve(file.content);
	},
	writeFile: ({body, bucketName, key, privacy, region}) => {
		writeMockS3File({
			body: body as string,
			bucketName,
			key,
			privacy,
			region,
		});
		return Promise.resolve(undefined);
	},
	headFile: ({bucketName, key, region}) => {
		const read = readMockS3File({
			bucketName,
			key,
			region,
		});
		if (!read) {
			const err = new Error('File not found');
			err.name = 'NotFound';
			throw err;
		}

		return Promise.resolve({
			ContentLength: read.content.toString().length,
			LastModified: new Date(),
		});
	},
	convertToServeUrl: convertToServeUrlImplementation,
	printLoggingHelper: false,
	getFolderFiles: () => [
		{
			filename: 'something',
			size: 0,
		},
	],
	makeArtifactWithDetails: () => ({
		filename: 'something',
		sizeInBytes: 0,
		s3Url: 'https://s3.af-south-1.amazonaws.com/bucket/key',
		s3Key: 'key',
	}),
	validateDeleteAfter: () => {},
	callFunctionAsync: getMockCallFunctionAsync,
	callFunctionStreaming: getMockCallFunctionStreaming,
	callFunctionSync: getMockCallFunctionSync,
	getCurrentFunctionName: () =>
		speculateFunctionName({
			diskSizeInMb: 10240,
			memorySizeInMb: 3009,
			timeoutInSeconds: 120,
		}),
	estimatePrice,
	getOutputUrl: () => {
		return {
			key: 'mock/mock.mp4',
			url: 'https://s3.mock-region-1.amazonaws.com/bucket/mock.mp4',
		};
	},
	isFlakyError,
	timer: () => ({
		end: () => {},
	}),
	forgetBrowserEventLoop: () => {},
	getBrowserInstance,
};
