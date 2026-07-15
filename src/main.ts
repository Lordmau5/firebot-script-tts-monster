import firebot, { Plugin } from "@crowbartools/firebot-types";

import playTTSEffect from './play-tts-effect';
import requestTTSEffect from './request-tts-effect';

import {
	ttsMonster
} from './tts-monster-api';

const plugin: Plugin<Params> = {
	manifest: {
		name: 'TTS.Monster',
		description: 'Adds TTS.Monster support to Firebot to request and play TTS messages',
		author: 'Lordmau5',
		version: '1.1.0',
		repo: 'https://github.com/Lordmau5/firebot-script-tts-monster',
		icon: {
			type: "font-awesome",
			name: "fa-volume-up",
			color: "#7c42e8",
		},
	},
	parametersSchema: [
		{
			name: "api_key",
			type: "string",
			default: "",
			title: "API Key",
			description: "Your TTS.Monster API key",
		},
		{
			name: "show_premade_voices",
			type: "boolean",
			default: true,
			title: "Show Premade Voices",
			description: "Enable to show premade voices provided by TTS.Monster",
		},
	],
	registers: {
		effects: [playTTSEffect, requestTTSEffect],
		frontendListeners: ttsMonster.frontendListeners
	},
};

export default plugin;
