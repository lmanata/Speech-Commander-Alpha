import shell from "shelljs"
const Speaker = require('speaker');

export const execOnMatch = (sentence, expressions, callback) => {
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

export const config = {
  auth: {
    keyFilePath: __dirname+'/../google-dependencies/secret.json',
    savedTokensPath: __dirname+'/../google-dependencies/tokens.js',
  },
  audio: {
    encodingIn: 'LINEAR16',
    sampleRateOut: 24000,
  },
};

export const speaker = new Speaker({
  channels: 1,
  sampleRate: config.audio.sampleRateOut,
});

export const youtubeVideo = url => {
  shell.exec(`chromium ${url}`)
}

export const googleSearch = search => {
  const url = "https://google.com/search?q="+encodeURIComponent(search)
  shell.exec(`chromium ${url}`)
}
