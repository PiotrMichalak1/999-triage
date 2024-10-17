import React, { useState } from "react";
import { Container } from "reactstrap";
import { getTokenOrRefresh } from "./token_util";
import "./custom.css";
import { ResultReason } from "microsoft-cognitiveservices-speech-sdk";

const speechsdk = require("microsoft-cognitiveservices-speech-sdk");

export default function App() {
  const [translationText, setTranslationText] = useState(
    "INITIALIZED: ready to test speech...",
  );
  const [assessmentText, setAssessmentText] = useState(
    "WAITING FOR ASSESSMENT...",
  );
  const [player, updatePlayer] = useState({ p: undefined, muted: false });

  async function sttFromMic() {
    const tokenObj = await getTokenOrRefresh();
    const speechConfig = speechsdk.SpeechConfig.fromAuthorizationToken(
      tokenObj.authToken,
      tokenObj.region,
    );
    //speechConfig.speechRecognitionLanguage = "";
    const autoDetectSourceLanguageConfig =
      speechsdk.AutoDetectSourceLanguageConfig.fromLanguages([
        "en-US",
        "ru-RU",
        "pl-PL",
        "ja-JP",
      ]);
    const audioConfig = speechsdk.AudioConfig.fromDefaultMicrophoneInput();
    const recognizer = speechsdk.SpeechRecognizer.FromConfig(
      speechConfig,
      autoDetectSourceLanguageConfig,
      audioConfig,
    );

    setTranslationText("speak into your microphone...");
    recognizer.recognizeOnceAsync((result) => {
      if (result.reason === ResultReason.RecognizedSpeech) {
        setTranslationText(`RECOGNIZED: Text=${result.text}`);
      } else {
        setTranslationText(
          "ERROR: Speech was cancelled or could not be recognized. Ensure your microphone is working properly.",
        );
      }
    });
  }

  async function sttFromMicWithTranslationToEnglish() {
    const tokenObj = await getTokenOrRefresh();
    const speechTranslationConfig =
      speechsdk.SpeechTranslationConfig.fromAuthorizationToken(
        tokenObj.authToken,
        tokenObj.region,
      );
    speechTranslationConfig.speechRecognitionLanguage = "en-GB";
    speechTranslationConfig.addTargetLanguage("en");
    const autoDetectSourceLanguageConfig =
      speechsdk.AutoDetectSourceLanguageConfig.fromLanguages([
        "en-US",
        "ru-RU",
        "pl-PL",
        "ja-JP",
      ]);
    const audioConfig = speechsdk.AudioConfig.fromDefaultMicrophoneInput();

    const translationRecognizer = speechsdk.TranslationRecognizer.FromConfig(
      speechTranslationConfig,
      autoDetectSourceLanguageConfig,
      audioConfig,
    );

    setTranslationText("speak into your microphone...");
    translationRecognizer.recognizeOnceAsync(
      function (result) {
        let translation = result.translations.get("en");
        setTranslationText(`Translated: Text=${translation}`);
        window.console.log(translation);
        translationRecognizer.close();
      },
      function (err) {
        window.console.log(err);
        translationRecognizer.close();
      },
    );
  }

  async function textToSpeech() {
    const tokenObj = await getTokenOrRefresh();
    const speechConfig = speechsdk.SpeechConfig.fromAuthorizationToken(
      tokenObj.authToken,
      tokenObj.region,
    );
    const myPlayer = new speechsdk.SpeakerAudioDestination();
    updatePlayer((p) => {
      p.p = myPlayer;
      return p;
    });
    const audioConfig = speechsdk.AudioConfig.fromSpeakerOutput(player.p);

    let synthesizer = new speechsdk.SpeechSynthesizer(
      speechConfig,
      audioConfig,
    );

    const textToSpeak =
      "This is an example of speech synthesis for a long passage of text. Pressing the mute button should pause/resume the audio output.";
    setTranslationText(`speaking text: ${textToSpeak}...`);
    synthesizer.speakTextAsync(
      textToSpeak,
      (result) => {
        let text;
        if (
          result.reason === speechsdk.ResultReason.SynthesizingAudioCompleted
        ) {
          text = `synthesis finished for "${textToSpeak}".\n`;
        } else if (result.reason === speechsdk.ResultReason.Canceled) {
          text = `synthesis failed. Error detail: ${result.errorDetails}.\n`;
        }
        synthesizer.close();
        synthesizer = undefined;
        setTranslationText(text);
      },
      function (err) {
        setTranslationText(`Error: ${err}.\n`);

        synthesizer.close();
        synthesizer = undefined;
      },
    );
  }

  async function handleMute() {
    updatePlayer((p) => {
      if (!p.muted) {
        p.p.pause();
        return { p: p.p, muted: true };
      } else {
        p.p.resume();
        return { p: p.p, muted: false };
      }
    });
  }

  async function fileChange(event) {
    const audioFile = event.target.files[0];
    console.log(audioFile);
    const fileInfo = audioFile.name + ` size=${audioFile.size} bytes `;

    setTranslationText(fileInfo);

    const tokenObj = await getTokenOrRefresh();
    const speechConfig = speechsdk.SpeechConfig.fromAuthorizationToken(
      tokenObj.authToken,
      tokenObj.region,
    );
    speechConfig.speechRecognitionLanguage = "en-US";

    const audioConfig = speechsdk.AudioConfig.fromWavFileInput(audioFile);
    const recognizer = new speechsdk.SpeechRecognizer(
      speechConfig,
      audioConfig,
    );

    recognizer.recognizeOnceAsync((result) => {
      let text;
      if (result.reason === ResultReason.RecognizedSpeech) {
        text = `RECOGNIZED: Text=${result.text}`;
      } else {
        text =
          "ERROR: Speech was cancelled or could not be recognized. Ensure your microphone is working properly.";
      }

      setTranslationText(fileInfo + text);
    });
  }

  return (
    <Container className="app-container vh-100">
      <h1 className="display-4 mb-3">999-triage</h1>

      <div className="row main-container h-50">
        <div className="col-6">
          <i
            className="fas fa-microphone fa-lg mr-2"
            onClick={() => sttFromMicWithTranslationToEnglish()}
          ></i>
          Translate speech to English text from your mic.
          <div className="mt-2">
            <label htmlFor="audio-file">
              <i className="fas fa-file-audio fa-lg mr-2"></i>
            </label>
            <input
              type="file"
              id="audio-file"
              onChange={(e) => fileChange(e)}
              style={{ display: "none" }}
            />
            Convert speech to text from an audio file.
          </div>
          <div className="mt-2">
            <i
              className="fas fa-volume-up fa-lg mr-2"
              onClick={() => textToSpeech()}
            ></i>
            Convert text to speech.
          </div>
          <div className="mt-2">
            <i
              className="fas fa-volume-mute fa-lg mr-2"
              onClick={() => handleMute()}
            ></i>
            Pause/resume text to speech output.
          </div>
        </div>
        <div className="col-6">
          <div className="output-display rounded h-50">
            <code>{translationText}</code>
          </div>
          <div className="mt-2 output-display rounded h-50">
            <code>{assessmentText}</code>
          </div>
        </div>
      </div>
    </Container>
  );
}
