import * as fs from 'fs-extra';
import {
	modules
} from './main';
import { Readable } from 'stream';
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

export default class TTSMonster {
	private static _instance: TTSMonster;

	private apiKey: string;

	private constructor() {}

	public static get instance() {
		if (!TTSMonster._instance) {
			TTSMonster._instance = new TTSMonster();
		}

		return TTSMonster._instance;
	}

	public setup(apiKey: string = '') {
		this.apiKey = apiKey;

		if (this.apiKey === '') {
			modules.logger.error('Missing API key');

			return;
		}
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
			modules.logger.error('Missing parameter {fileName}');

			return;
		}
		else if (!message) {
			modules.logger.error('Missing parameter {message}');

			return;
		}

		const ttsUrl = `${ ttsMonsterAPI }/generate`;
		const options = {
			method: 'POST',
			headers: {
				Authorization: this.apiKey,
			},
			body: JSON.stringify({
				voice_id,
				message,
			})
		};

		const writeStream = fs.createWriteStream(fileName);

		try {
			const ttsResponse = await fetch(ttsUrl, options);
			const { url }: { url: string } = await ttsResponse.json();

			const generatedAudio = await fetch(url);
			await pipeline(generatedAudio.body as any, writeStream);

			return {
				status: 'ok',
				fileName: fileName
			};
		}
		catch (err) {
			modules.logger.error(err);
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
		const voicesURL = `${ ttsMonsterAPI }/voices`;
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
		catch (err) {
			modules.logger.error(err);
			throw err;
		}
	}

	public formatNumber(num: number) {
		return num.toLocaleString(undefined, {
			maximumFractionDigits: 0
		});
	}

	public async fetchSubscriptionData(): Promise<TTSMonsterSubscriptionData> {
		const subscriptionInfoURL = `${ ttsMonsterAPI }/user`;
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
		catch (err) {
			modules.logger.error(err);
			throw err;
		}
	}
}
