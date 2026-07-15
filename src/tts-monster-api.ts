import firebot, { FrontendListener } from '@crowbartools/firebot-types';

import * as fs from 'fs-extra';
import { pipeline } from 'stream/promises';

const ttsMonsterAPI = 'https://api.console.tts.monster';

export interface TTSMonsterSubscriptionData {
	character_usage: number;
	current_plan: string;
	downgrading_to_plan: string;
	has_payment_method: boolean;
	portal_url: string;
	renewal_time: number;
	status: string;

	character_usage_formatted: string;
	renewal_time_formatted: string;
}

interface TTSMonsterVoices {
	voices: TTSMonsterVoice[];
	customVoices: TTSMonsterVoice[];
}

export interface TTSMonsterVoice {
	voice_id: string;
	name: string;
	sample: string;
	metadata: string;
}

class TTSMonster {
	private apiKey: string = '';

	public tts_promises: Map<string, Promise<any>> = new Map();

	public frontendListeners: FrontendListener[];

	public constructor() {
		this.frontendListeners = [
			{
				eventName: 'tts-monster-get-voices',
				handler: async () => {
					const response = {
						error: false,
						voices: [] as TTSMonsterVoice[]
					};

					try {
						const {
							show_premade_voices
						} = (firebot.parameters.getAll() as Params);

						this.setup();

						const voices = await this.fetchVoices({
							show_premade_voices
						});

						response.voices = voices;
					}
					catch (err) {
						firebot.logger.error('Unable to fetch voices', err);
						response.error = true;
					}

					return response;
				},
				useAsync: true
			},
			{
				eventName: 'tts-monster-get-subscription-data',
				handler: async () => {
					const response = {
						error: false,
						subscriptionData: {} as TTSMonsterSubscriptionData
					};

					try {
						this.setup();

						response.subscriptionData = await this.fetchSubscriptionData();
					}
					catch (err) {
						firebot.logger.error('Unable to fetch voices', err);
						response.error = true;
					}

					return response;
				},
				useAsync: true
			}
		];
	}

	public setup(): boolean {
		const {
			api_key
		} = (firebot.parameters.getAll() as Params);

		this.apiKey = api_key;

		if (this.apiKey === '') {
			firebot.logger.error('Missing API key');

			return false;
		}

		return true;
	}

	public async textToSpeech({
		voice_id = '0993f688-6719-4cf6-9769-fee7b77b1df5', // Default voice 'Nova'
		fileName,
		message,
	}: {
		voice_id?: string,
		fileName: string,
		message: string,
	}) {
		if (!fileName) {
			firebot.logger.error('Missing parameter {fileName}');

			return;
		}
		else if (!message) {
			firebot.logger.error('Missing parameter {message}');

			return;
		}

		const ttsUrl = `${ttsMonsterAPI}/generate`;
		const options = {
			method: 'POST',
			headers: {
				Authorization: this.apiKey,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				voice_id,
				message,
			})
		};

		const writeStream = fs.createWriteStream(fileName);

		try {
			const ttsResponse = await fetch(ttsUrl, options);
			const { url, status }: { url: string, status: string } = await ttsResponse.json();

			const generatedAudio = await fetch(url);
			await pipeline(generatedAudio.body as any, writeStream);

			return {
				status: 'ok',
				fileName: fileName
			};
		}
		catch (err: any) {
			firebot.logger.error(err);
			throw err;
		}
	}

	public sortVoices(voices: TTSMonsterVoice[]) {
		return voices.sort((a, b) => a.name.localeCompare(b.name));
	}

	public async fetchVoices({
		show_premade_voices = true
	}: {
		show_premade_voices?: boolean
	}): Promise<TTSMonsterVoice[]> {
		const voicesURL = `${ttsMonsterAPI}/voices`;
		const options = {
			method: 'POST',
			headers: {
				Authorization: this.apiKey,
			}
		};

		try {
			const response = await fetch(voicesURL, options);

			const voices: TTSMonsterVoices = await response.json();
			this.sortVoices(voices.customVoices);
			this.sortVoices(voices.voices);

			const combined_voices = show_premade_voices
				? [...voices.customVoices, ...voices.voices]
				: [...voices.customVoices];

			return combined_voices;
		}
		catch (err: any) {
			firebot.logger.error(err);
			throw err;
		}
	}

	public formatNumber(num: number) {
		return num.toLocaleString(undefined, {
			maximumFractionDigits: 0
		});
	}

	public async fetchSubscriptionData(): Promise<TTSMonsterSubscriptionData> {
		const subscriptionInfoURL = `${ttsMonsterAPI}/user`;
		const options = {
			method: 'POST',
			headers: {
				Authorization: this.apiKey
			}
		};

		try {
			const response = await fetch(subscriptionInfoURL, options);
			const subData: TTSMonsterSubscriptionData = await response.json();

			subData.character_usage_formatted = this.formatNumber(subData.character_usage);
			subData.renewal_time_formatted = new Date(
				subData.renewal_time * 1000
			).toLocaleString();

			return subData;
		}
		catch (err: any) {
			firebot.logger.error(err);
			throw err;
		}
	}
}

export const ttsMonster = new TTSMonster();