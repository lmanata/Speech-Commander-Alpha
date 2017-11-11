import {
  execOnMatch,
  config,
  speaker,
  youtubeVideo,
  googleSearch
} from "./utils"
import shell from "shelljs"
import record from 'node-record-lpcm16'
import GoogleAssistant from 'google-assistant'

const myName = "https://www.youtube.com/watch?v=AfIOBLr1NDU"
const startConversation = (conversation) => {
  console.log('Say something!');

  let spokenResponseLength = 0;
  let speakerOpenTime;
  let speakerTimer;

  // setup the conversation
  conversation
    // send the audio buffer to the speaker
    .on('audio-data', (data) => {
      const now = new Date().getTime();
      // kill the speaker after enough data has been sent to it and then let it flush out
      spokenResponseLength += data.length;
      const audioTime = spokenResponseLength / (config.audio.sampleRateOut * 16 / 8) * 1000;
      clearTimeout(speakerTimer);
      speakerTimer = setTimeout(() => {
      }, audioTime - Math.max(0, now - speakerOpenTime));
    })
    // done speaking, close the mic
    .on('end-of-utterance', () => record.stop())
    // just to spit out to the console what was said
    .on('transcription', text => {
      let searchTerm = text.split(" ").slice(-1)
      execOnMatch(text,["what","what's","my","name","is"], () => youtubeVideo(myName))
      //execOnMatch(text, ["open", "chrome", "find", "get", "google", "search", "some", "give", "need", "i"], () => googleSearch(searchTerm))
      console.log('ME:', text)
    })
    // once the conversation is ended, see if we need to follow up
    .on('ended', (error, continueConversation) => {
      if (error) console.log('Conversation Ended Error:', error);
      else if (continueConversation) assistant.start();
      else console.log('Conversation Complete');
    })
    // catch any errors
    .on('error', (error) => {
      console.log('Conversation Error:', error);
    });

  // pass the mic audio to the assistant
  const mic = record.start({ threshold: 0 });
  mic.on('data', data => conversation.write(data));

  // setup the speaker
  speaker
    .on('open', () => {
      console.log('Assistant Speaking');
      speakerOpenTime = new Date().getTime();
    })
    .on('close', () => {
      console.log('Assistant Finished Speaking');
      conversation.end();
    });
};

// setup the assistant
const assistant = new GoogleAssistant(config);
assistant
  .on('ready', () => {
    // start a conversation!
    assistant.start();
  })
  .on('started', startConversation)
  .on('error', (error) => {
    console.log('Assistant Error:', error);
  });
