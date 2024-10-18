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
    try {
      const translation = await getTranslation(); // Call to getTranslation
      console.log("Translation is: " + translation);

      if (translation === "Cannot recognize speech") {
        setTranslationText("Error: " + translation);
        setAssessmentText(
          "Medium: The inability to recognize speech can indicate a range of issues, from minor technical problems to more serious concerns such as a cognitive impairment or medical condition.",
        );
      } else {
        const assessment = await sendToOpenAI(translation);
        console.log("Assessment from OpenAI:", assessment);
        setAssessmentText("Assessment from OpenAI: " + assessment);
      }
    } catch (error) {
      console.error("Error in speech-to-text flow:", error);
      setAssessmentText("Error: " + error.message);
    }
  }

  async function getTranslation() {
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
    try {
      const result = await new Promise((resolve, reject) => {
        translationRecognizer.recognizeOnceAsync(
          (result) => resolve(result),
          (err) => reject(err),
        );
      });

      let translation = result.translations.get("en");
      setTranslationText(translation);
      return translation === undefined
        ? "Cannot recognize speech"
        : translation;
    } catch (err) {
      console.error("Error recognizing speech:", err);
      return "Cannot recognize speech";
    } finally {
      translationRecognizer.close();
    }
  }

  async function sendToOpenAI(translatedText) {
    const ENDPOINT =
      "https://999-triage-poc-openai.openai.azure.com/openai/deployments/gpt-4o-mini/chat/completions?api-version=2024-08-01-preview";

    const payload = {
      messages: [
        {
          role: "system",
          content: [
            {
              type: "text",
              text: "You're an assistant designed to analyze emergency. Categorise in 3 categories High, Medium and Low based on the situation. Explain why this category was chosen.",
            },
          ],
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: translatedText,
            },
          ],
        },
      ],
      temperature: 0.7,
      top_p: 0.95,
      max_tokens: 800,
      stream: false,
    };

    try {
      const response = await fetch(ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "api-key": process.env.REACT_APP_TRIAGE_OPEAN_AI_KEY,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Error: ${response.status} ${response.statusText}`);
      }

      const responseData = await response.json();
      return responseData.choices[0].message.content; // Adjust according to your API response structure
    } catch (error) {
      console.error("Error sending to OpenAI:", error);
    }
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
