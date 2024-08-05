# Roan AI

An AI for Roan's room. Ultimately, he wants something like C3PO. We'll start with the easiest part: the brain.

## Saturday, August 3, 2024

To get something working quickly, I began from @developersdigest [Create-Your-Own-Voice-Assistant-with-Node.js-Langchain-Eleven-Labs-in-9-Minutes](https://github.com/developersdigest/Create-Your-Own-Voice-Assistant-with-Node.js-Langchain-Eleven-Labs-in-9-Minutes). It was a little out-of date; langchain has reoragnized how they publish their npm packages. It was also missing a couple of dependencies from package.json. These difficulties were easy enough to overcome. The base project is quite janky, running external applications to record and play .mp3 files. Nevertheless, it did live up to the title of getting started super quickly.

Roan was really interested in giving the bot a "robot" voice. Neither ElevenLabs nor OpenAI provide one, so I added a distortion step using ffmpeg.

AWS and Google offer speach-to-text with streaming and diarization. Switching from OpenAI to one of these services might improve the chatbot by giving lower latency and offering a possibility of tracking a conversation when there is more than one speaker.

There are a lot more options if we rewrite this in Python. Maybe we'll go that way. It looks like an uphill battle to remove the reliance on external applications (sox, ffmpeg, afplay) while sticking to the Node.js ecosystem.

## Sunday, August 4, 2024

One obvious problem is that using a wake word is quite awkward for a multi-turn conversation. We'll try using vision to solve this. The bot will become interactive when a person is looking at the camera.

For Mac, we need imagesnap.

```
brew install imagesnap
```

On Linux, we need fswebcam.

```
sudo apt-get install fswebcam
```
