# Firebot TTS.Monster Custom Script

## A custom script that allows TTS.Monster to be used in Firebot

### How to install
1. Go to the [releases](https://github.com/Lordmau5/firebot-script-tts-monster/releases/) tab and download the latest `tts-monster.js`
2. Open Firebot and head to Settings -> Scripts -> Manage Startup Scripts
3. Click `Add New Script`
4. Click on the `scripts folder` link in the popup and place the `tts-monster.js` inside
5. Click the blue reload button next to the `Pick one` dropdown to refresh the available scripts
6. Select `tts-monster.js` in the dropdown and put your API key in the textbox  
    You can find your API key by heading to the [TTS.Monster Console](https://console.tts.monster/), clicking on your account in the bottom left,  
    then clicking `API Token` and copying the key in the popup.
7. Click `Save` - You might have to restart Firebot for the script to load.

### How to use
This TTS script works a bit differently to the conventional ones.  
You first have to request a TTS to be generated and will get an internal TTS token, which you then use to play it back.
1. Add a `Request TTS.Monster TTS` effect and select all the settings you want for the generation
2. It will output as `$effectOutput[ttsToken]` which you can use in other effects
3. Add a `Play TTS.Monster TTS` effect and put `$effectOutput[ttsToken]` into the **TTS Token** textbox
