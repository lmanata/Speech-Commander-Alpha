const shell = require('shelljs')
const record = require('node-record-lpcm16');
const Speaker = require('speaker');
const GoogleAssistant = require('google-assistant');

const execOnMatch = (sentence, expressions, callback) => {
  let occurences = false
  expressions.map( expression => {
    occurences += sentence.includes(expression) ? 1 : 0
  })

  if( occurences )
    callback()
}

const audioFromText = (url, callback) => {
  console.log(url)

  fetch(url)
    .then(response => response.arrayBuffer())
    .then(buffer => {
      callback(buffer)
    });
}

const config = {
  auth: {
    keyFilePath: __dirname+'/google-dependencies/secret.json',
    savedTokensPath: __dirname+'/google-dependencies/tokens.js',
  },
  audio: {
    encodingIn: 'LINEAR16', // supported are LINEAR16 / FLAC (defaults to LINEAR16)
    sampleRateOut: 24000, // supported are 16000 / 24000 (defaults to 24000)
  },
};

const speaker = new Speaker({
  channels: 1,
  sampleRate: config.audio.sampleRateOut,
});

const googleSearch = search => {
  const url = "google.com/search?q="+encodeURIComponent(search)
  shell.exec(`chromium ${url}`)
}

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
      execOnMatch(text, ["open", "chrome", "find", "get", "google", "search", "some", "give", "need", "i"], () => googleSearch(searchTerm))
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
