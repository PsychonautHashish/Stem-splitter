import { useState, useRef } from 'react'

const AudioProcessor = () => {
  const [extractedAudio, setExtractedAudio] = useState(null)
  const [audioFile, setAudioFile] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const audioRef = useRef(null)

  const handleFileUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    setIsLoading(true)
    setAudioFile(URL.createObjectURL(file))

    try {
      const arrayBuffer = await file.arrayBuffer()
      const audioContext = new (window.AudioContext || window.webkitAudioContext)()
      const buffer = await audioContext.decodeAudioData(arrayBuffer)
      const processedUrl = await processAudio(buffer)
      setExtractedAudio(processedUrl)
    } catch (error) {
      console.error('Error processing audio:', error)
    }
    setIsLoading(false)
  }

  const processAudio = async (buffer) => {
    const offlineContext = new OfflineAudioContext(
      buffer.numberOfChannels,
      buffer.length,
      buffer.sampleRate
    )

    const source = offlineContext.createBufferSource()
    source.buffer = buffer

    const splitter = offlineContext.createChannelSplitter(2)
    source.connect(splitter)

    const merger = offlineContext.createChannelMerger(2)
    
    const midProcessor = offlineContext.createScriptProcessor(4096, 2, 2)
    
    midProcessor.onaudioprocess = (e) => {
      const left = e.inputBuffer.getChannelData(0)
      const right = e.inputBuffer.getChannelData(1)
      const output = e.outputBuffer
      
      for (let channel = 0; channel < output.numberOfChannels; channel++) {
        const outputData = output.getChannelData(channel)
        for (let i = 0; i < left.length; i++) {
          outputData[i] = (left[i] + right[i]) / 2
        }
      }
    }

    const bandpass = offlineContext.createBiquadFilter()
    bandpass.type = 'bandpass'
    bandpass.frequency.value = 1000
    bandpass.Q.value = 1

    const highpass = offlineContext.createBiquadFilter()
    highpass.type = 'highpass'
    highpass.frequency.value = 80

    splitter.connect(midProcessor)
    midProcessor.connect(highpass)
    highpass.connect(bandpass)
    bandpass.connect(merger, 0, 0)
    bandpass.connect(merger, 0, 1)
    merger.connect(offlineContext.destination)

    source.start()
    const renderedBuffer = await offlineContext.startRendering()
    
    const wavBlob = audioBufferToWav(renderedBuffer)
    return URL.createObjectURL(wavBlob)
  }

  const audioBufferToWav = (buffer) => {
    const numChannels = buffer.numberOfChannels
    const length = buffer.length * numChannels * 2 + 44
    const wav = new Uint8Array(length)
    
    const view = new DataView(wav.buffer)
    const writeString = (offset, string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i))
      }
    }

    writeString(0, 'RIFF')
    view.setUint32(4, 36 + buffer.length * numChannels * 2, true)
    writeString(8, 'WAVE')
    writeString(12, 'fmt ')
    view.setUint32(16, 16, true)
    view.setUint16(20, 1, true)
    view.setUint16(22, numChannels, true)
    view.setUint32(24, buffer.sampleRate, true)
    view.setUint32(28, buffer.sampleRate * numChannels * 2, true)
    view.setUint16(32, numChannels * 2, true)
    view.setUint16(34, 16, true)
    writeString(36, 'data')
    view.setUint32(40, buffer.length * numChannels * 2, true)

    let offset = 44
    for (let i = 0; i < buffer.numberOfChannels; i++) {
      const channel = buffer.getChannelData(i)
      for (let j = 0; j < channel.length; j++) {
        const sample = Math.max(-1, Math.min(1, channel[j]))
        view.setInt16(offset, sample * 0x7fff, true)
        offset += 2
      }
    }

    return new Blob([wav], { type: 'audio/wav' })
  }

  return (
    <div>
      <div className="upload-container">
        <input 
          type="file" 
          id="audio-upload"
          accept="audio/*" 
          onChange={handleFileUpload}
          className="file-input"
        />
        <label htmlFor="audio-upload" className="file-label">
          <img 
            src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSIjZmZmZmZmIj48cGF0aCBkPSJNMTkgMTJ2NWgtMnYtNWgtM3Y1aC0ydi01SDl2NUg3di01SDR2LTJoM3YtNUg3VjVoMnY1aDN2LTVoMnY1aDN2LTVoMnY1aDV2MnoiLz48L3N2Zz4=" 
            className="upload-icon" 
            alt="Upload"
          />
          Choose Audio File
        </label>
      </div>
      
      {isLoading && (
        <p className="loading-text">
          Processing audio
          <span className="loading-dot">.</span>
          <span className="loading-dot">.</span>
          <span className="loading-dot">.</span>
        </p>
      )}
      
      {audioFile && (
        <div className="audio-container">
          <h3>Original Audio:</h3>
          <audio controls src={audioFile} ref={audioRef} className="audio-player" />
        </div>
      )}
      
      {extractedAudio && (
        <div className="audio-container">
          <h3>Extracted Vocals:</h3>
          <audio controls src={extractedAudio} className="audio-player" />
          <a href={extractedAudio} download="vocals.wav" className="download-link">
            Download Vocals
          </a>
        </div>
      )}
    </div>
  )
}

export default AudioProcessor