import React, { useState } from "react";
import { Container } from "reactstrap";
import "./custom.css";

const speechsdk = require("microsoft-cognitiveservices-speech-sdk");

export default function App() {
  const [translationText, setTranslationText] = useState(
    "INITIALIZED: ready to test speech...",
  );
  const [assessmentText, setAssessmentText] = useState(
    "WAITING FOR ASSESSMENT...",
  );

  async function sttFromMicWithTranslationToEnglish() {
    const speechTranslationConfig =
      speechsdk.SpeechTranslationConfig.fromSubscription(
        process.env.REACT_APP_TRIAGE_SPEECH_KEY,
        process.env.REACT_APP_TRIAGE_SPEECH_REGION,
      );
    speechTranslationConfig.speechRecognitionLanguage = "en-GB"; //need to specify for proper TranslationRecognizer initialization
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
