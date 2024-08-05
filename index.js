// 1. Importing required modules i.e. npm install mic sound-play wav stream openai langchain elevenlabs-node dotenv
import mic from 'mic';
import sound  from 'sound-play'
import { Writer } from 'wav';
import { Writable } from 'stream';
import fs, { createWriteStream } from 'fs';
import { OpenAI } from 'openai';
import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import dotenv from 'dotenv';
import ffmpeg from 'fluent-ffmpeg';
import NodeWebcam from 'node-webcam';
import isLooking from './src/isLooking.js';
dotenv.config();
const webcamOptions = {
    width: 1280,
    height: 720,
    quality: 100,
    delay: 0,
    saveShots: true,
    output: "jpeg",
    device: false,
    callbackReturn: "location",
    verbose: false
};
const webcam = NodeWebcam.create(webcamOptions);
// 2. Setup for OpenAI and keyword detection.
const openai = new OpenAI();
const keyword = "echo";
// 3. Initial microphone setup.
let micInstance = mic({ rate: '16000', channels: '1', debug: false, exitOnSilence: 6 });
let micInputStream = micInstance.getAudioStream();
let isRecording = false;
let audioChunks = [];
// 4. Initiate recording.
const startRecordingProcess = () => {
    console.log("Starting listening process...");
    micInstance.stop();
    micInputStream.unpipe();
    micInstance = mic({ rate: '16000', channels: '1', debug: false, exitOnSilence: 10 });
    micInputStream = micInstance.getAudioStream();
    audioChunks = [];
    isRecording = true;
    micInputStream.pipe(new Writable({
        write(chunk, _, callback) {
            if (!isRecording) return callback();
            audioChunks.push(chunk);
            callback();
        }
    }));
    micInputStream.on('silence', handleSilence);
    micInstance.start();
};
// 5. Handle silence and detection.
const handleSilence = async () => {
    console.log("Detected silence...");
    if (!isRecording) return;
    isRecording = false;
    micInstance.stop();
    if (isLooking()) {
        const audioFilename = await saveAudio(audioChunks);
        const message = await transcribeAudio(audioFilename);
        if (message && message.toLowerCase().includes(keyword)) {
            console.log("Keyword detected...");
            const responseText = await getOpenAIResponse(message);
            const fileName = await convertResponseToAudio(responseText);
            await applyRoboticEffect(`./audio/${fileName}`, `./audio/robot-${fileName}`);
            console.log("Playing audio...");
            await sound.play(`./audio/robot-${fileName}`);
            console.log("Playback finished...");
        }
    }
    startRecordingProcess();
};
// 6. Save audio.
const saveAudio = async audioChunks => {
    return new Promise((resolve, reject) => {
        console.log("Saving audio...");
        const audioBuffer = Buffer.concat(audioChunks);
        const wavWriter = new Writer({ sampleRate: 16000, channels: 1 });
        const filename = `${Date.now()}.wav`;
        const filePath = './audio/' + filename;
        wavWriter.pipe(createWriteStream(filePath));
        wavWriter.on('finish', () => {
            resolve(filename);
        });
        wavWriter.on('error', err => {
            reject(err);
        });
        wavWriter.end(audioBuffer);
    });
};
// 7. Transcribe audio.
const transcribeAudio = async filename => {
    console.log("Transcribing audio...");
    const audioFile = fs.createReadStream('./audio/' + filename);
    const transcriptionResponse = await openai.audio.transcriptions.create({
        file: audioFile,
        model: "whisper-1",
    });
    return transcriptionResponse.text;
};
// 8. Communicate with OpenAI.
const messages = [
    new SystemMessage("You are an AI named Echo. You are positive and kind."),
];
const getOpenAIResponse = async message => {
    console.log("Communicating with OpenAI...");
    messages.push(new HumanMessage(message));
    const chat = new ChatOpenAI();
    const response = await chat.call(messages);
    messages.push(response);
    return response.text;
};
// 9. Convert response to audio using OpenAI.
async function convertResponseToAudio(text) {
    const fileName = `${Date.now()}.mp3`;
    console.log("Converting response to audio...");
    const response = await openai.audio.speech.create({model: "tts-1", voice: "echo", input: text});
    const fileWriteStream = fs.createWriteStream('./audio/' + fileName);
    response.body.pipe(fileWriteStream);
    return new Promise((resolve, reject) => {
        fileWriteStream.on('finish', () => {
            console.log("Audio conversion done...");
            resolve(fileName);
        });
        response.body.on('error', reject);
    });
};
function applyRoboticEffect(inputFile, outputFile) {
    return new Promise((resolve, reject) => {
        ffmpeg(inputFile)
          .audioFilters([
              'treble=g=10', // Boost the treble
              'afftdn=nf=-25', // Noise reduction
              'aecho=0.8:0.88:6:0.4', // Echo effect
              'flanger', // Flanger effect
              'aresample=async=1' // Resample audio
          ])
          .toFormat('mp3')
          .on('end', () => resolve(outputFile))
          .on('error', reject)
          .save(outputFile);
    });
}
// 10. Start the application and keep it alive.
startRecordingProcess();
process.stdin.resume();
