/* eslint-disable require-jsdoc */
const functions = require("firebase-functions");
const ffmpeg = require("fluent-ffmpeg");
const path = require("path");
const os = require("os");
const admin = require("firebase-admin");
admin.initializeApp();

function isM4AFile(m4aFileName) {
  const ext = path.extname(m4aFileName);
  return ext === ".m4a";
}

function converM4AtoWAV(m4aFileName) {
  return new Promise((resolve, reject) => {
    if (!isM4AFile(m4aFileName)) {
      throw new Error("Not a wav file");
    }
    const outputFile = m4aFileName.replace(".m4a", ".wav");
    ffmpeg({
      source: m4aFileName,
    }).on("error", (err) => {
      reject(err);
    }).on("end", () => {
      resolve(outputFile);
    }).withAudioFrequency(16000).withAudioChannels(1).save(outputFile);
  });
}


exports.handleUpload = functions.storage.object().onFinalize(async (object) => {
  const fileBucket = object.bucket;
  // The Storage bucket that contains the file.
  const filePath = object.name; // File path in the bucket.
  const fileName = path.basename(filePath);

  const bucket = admin.storage().bucket(fileBucket);
  const tempFilePath = path.join(os.tmpdir(), fileName);

  if (fileName.includes("wav")) {
    return functions.logger.log("This is a wav file");
  }


  await bucket.file(filePath).download({destination: tempFilePath});

  functions.logger.log("Audio downloaded locally to", tempFilePath);
  // convert file to wav
  const newWAV = await converM4AtoWAV(tempFilePath);
  const wavFileName = path.basename(newWAV);

  functions.logger.log("Audio converted to wav");

  // upload file to bucket
  await bucket.upload(newWAV, {
    destination: "wav/" + wavFileName,
    metadata: {
      type: "audio/wav",
    },
  });

  // create a firestore document
  const db = admin.firestore();

  await db.collection("audio").doc().set({
    name: wavFileName,
    status: "uploaded",
    url: "gs://audio-sentiment-youtube.appspot.com/wav/" + wavFileName,
  });

  return functions.logger
      .log("Audio uploaded to Storage at", "wav/" + wavFileName);
});

exports.handleTranscription = functions.firestore.document("audio/{audioId}")
    .onCreate(async (snap, context) => {
      // get the audio file, and use google natural language to transcribe it
      const audio = snap.data();
      const audioUrl = audio.url;
      const audioId = context.params.audioId;

      const speech = require("@google-cloud/speech");
      const client = new speech.SpeechClient();

      const config = {
        encoding: "LINEAR16",
        sampleRateHertz: 16000,
        languageCode: "en-US",
      };

      const audioFile = {
        uri: audioUrl,
      };

      const request = {
        config: config,
        audio: audioFile,
      };

      const [response] = await client.recognize(request);

      const transcription = response.results
          .map((result) => result.alternatives[0].transcript)
          .join("\n");

      functions.logger.log("Transcription: ", transcription);

      const db = admin.firestore();

      await db.collection("audio").doc(audioId).update({
        status: "transcribed",
        transcription: transcription,
      });

      return functions.logger.log("Transcription saved to Firestore");
    });
