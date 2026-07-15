import * as fs from 'fs-extra';

import firebot, { EffectType } from '@crowbartools/firebot-types';
import template from './template.html';
import {
	TTSMonsterSubscriptionData,
	TTSMonsterVoice,
	ttsMonster
} from '../tts-monster-api';
import path from 'path';

interface EffectModel {
	voice: TTSMonsterVoice;

	text: string;

	waitForGeneration: boolean;
}

const effect: EffectType<EffectModel> = {
	definition: {
		id: 'lordmau5:tts:tts-monster-request-tts',
		name: 'Request TTS.Monster TTS',
		description: 'Request a TTS message using TTS.Monster (returns a TTS token)',
		icon: 'fad fa-microphone-alt',
		categories: [
			'fun',
			'integrations'
		],
		// @ts-ignore
		outputs: [{
			label: 'TTS Token',
			description: 'The TTS token to use for the play effect',
			defaultName: 'ttsToken'
		}]
	},
	optionsTemplate: template,
	optionsController: ($scope, utilityService: any, backendCommunicator: any, $q: any, $timeout: any) => {
		$q.when(backendCommunicator.fireEventAsync('tts-monster-get-voices'))
			.then(({
				error, voices
			}: { error: boolean, voices: TTSMonsterVoice[] }) => {
				if (error || !voices.length) {
					return;
				}

				if ($scope.effect.voice == null) {
					$scope.effect.voice = voices[0];
				}

				$scope.voices = voices;
			});

		$scope.fetchingSubscriptionData = true;
		$q.when(backendCommunicator.fireEventAsync('tts-monster-get-subscription-data'))
			.then(({
				error, subscriptionData
			}: { error: boolean, subscriptionData: TTSMonsterSubscriptionData }) => {
				$scope.fetchingSubscriptionData = false;

				if (error || !subscriptionData) {
					return;
				}

				$scope.subscriptionData = subscriptionData;
			});
	},
	optionsValidator: effect => {
		const errors: string[] = [];

		if (!effect.text?.length) {
			errors.push('Please provide text to synthesize.');
		}

		return errors;
	},
	onTriggerEvent: async event => {
		const effect = event.effect;

		const voice_id = effect.voice.voice_id;

		if (!!voice_id.length) {
			firebot.logger.error('No Voice ID specified.');

			return false;
		}

		if (!effect.text.length) {
			firebot.logger.error('No text specified.');

			return false;
		}

		ttsMonster.setup();

		const ttsToken = crypto.randomUUID();

		let wavPath = undefined;
		try {
			const TTS_MONSTER_TMP_DIR = path.join(firebot.storage.path, '..', '..', 'tmp', 'ttsmonster');

			if (!(await fs.pathExists(TTS_MONSTER_TMP_DIR))) {
				await fs.mkdirp(TTS_MONSTER_TMP_DIR);
			}

			wavPath = path.join(TTS_MONSTER_TMP_DIR, `${ttsToken}.wav`);
		}
		catch (err) {
			firebot.logger.error('Unable to prepare temp folder', err);

			return false;
		}

		try {
			const tts = ttsMonster.textToSpeech({
				voice_id,
				fileName: wavPath,
				message: effect.text
			});

			ttsMonster.tts_promises.set(ttsToken, tts);

			if (effect.waitForGeneration) {
				await tts;
			}

			return {
				success: true,
				outputs: {
					ttsToken
				}
			};
		}
		catch (err) {
			firebot.logger.error('Unable to save TTS', err);

			return false;
		}
	}
};

export default effect;
