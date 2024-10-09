import TTSMonster, {
	TTSMonsterSubscriptionData
} from './tts-monster-api';
import {
	v4 as uuid
} from 'uuid';
import * as fs from 'fs-extra';

import {
	Effects
} from '@crowbartools/firebot-custom-scripts-types/types/effects';
import template from './request-tts.html';
import {
	modules, parameters, tts_promises
} from './main';
import EffectType = Effects.EffectType;
import {
	TTSMonsterVoice
} from './tts-monster-api';

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
		outputs: [ {
			label: 'TTS Token',
			description: 'The TTS token to use for the play effect',
			defaultName: 'ttsToken'
		} ]
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
	onTriggerEvent: async scope => {
		const effect = scope.effect;

		const voice_id = effect.voice.voice_id;

		if (!parameters.api_key.length || !voice_id.length) {
			modules.logger.error('No API key or Voice ID specified.');

			return false;
		}

		if (!effect.text.length) {
			modules.logger.error('No text specified.');

			return false;
		}

		const api = TTSMonster.instance;
		api.setup(parameters.api_key);

		const ttsToken = uuid();

		let wavPath = undefined;
		try {
			const TTS_MONSTER_TMP_DIR = modules.path.join(SCRIPTS_DIR, '..', 'tmp', 'ttsmonster');

			if (!(await fs.pathExists(TTS_MONSTER_TMP_DIR))) {
				await fs.mkdirp(TTS_MONSTER_TMP_DIR);
			}

			wavPath = modules.path.join(TTS_MONSTER_TMP_DIR, `${ ttsToken }.wav`);
		}
		catch (err) {
			modules.logger.error('Unable to prepare temp folder', err);

			return false;
		}

		try {
			const tts = api.textToSpeech({
				voice_id,
				fileName: wavPath,
				message: effect.text
			});

			tts_promises.set(ttsToken, tts);

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
			modules.logger.error('Unable to save TTS', err);

			return false;
		}
	}
};

export default effect;
