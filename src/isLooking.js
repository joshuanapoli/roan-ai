import NodeWebcam from 'node-webcam';
import fs from 'fs';
import { OpenAI } from 'openai';
import iterm2 from 'iterm2-image';
import dotenv from 'dotenv';

dotenv.config();

// 1. Setup OpenAI
const openai = new OpenAI(process.env.OPENAI_API_KEY);

// 2. Configure webcam options
const webcamOptions = {
    width: 512,
    height: 512,
    quality: 100,
    delay: 0,
    saveShots: true,
    output: "jpeg",
    device: false,
    callbackReturn: "location",
    verbose: false
};

const webcam = NodeWebcam.create(webcamOptions);

function readFileAsBase64(filePath) {
  return new Promise((resolve, reject) => {
    fs.readFile(filePath, { encoding: 'base64' }, (err, data) => {
      if (err) {
        reject(err);
      } else {
        resolve(data);
      }
    });
  });
}

function captureAndDescribePhoto() {
    const photoPath = `./photos/photo_${Date.now()}.jpg`;
    return new Promise((resolve, reject) => {
      webcam.capture(photoPath, async (err, data) => {
        if (err) {
          console.error("Error capturing photo:", err);
          return;
        }
        console.log("Photo captured:", data);
        iterm2(photoPath, () => {
        });
        const photobase64 = await readFileAsBase64(photoPath);
        try {
          const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
              {role: "system", content: [{type: "text", text: "You are a robot."}]},
              {
                role: "user",
                content: [
                  {
                    type: "text",
                    text: "Is there a person in the picture and are they looking at the camera? Answer 'yes' or 'no'."
                  },
                  {
                    type: "image_url",
                    image_url: {
                      "url": `data:image/jpeg;base64,${photobase64}`,
                      "detail": "low"
                    },
                  },
                ],
              },
            ],
          });
          resolve(response.choices[0].message.content.toLowerCase().includes("yes"));
        } catch (error) {
          console.error("Error getting description:", error);
          reject(error);
        }
      });
    });
}

let isLookingFlag = false;

// Check whether there is a person in the webcam view. This is very inefficient; it updates about once every 5 seconds
async function main() {
  while(true) {
    isLookingFlag = await captureAndDescribePhoto();
    console.log("Looking:", (new Date()).toISOString(), isLookingFlag);
  }
}

main().catch(console.error);

export default function isLooking() {
  return isLookingFlag;
}
