import path from 'node:path'
import { ensureAndCreate } from '../utils/fs'


export function SnippetAdd(name , outDir="public"){
    const targetDir = path.resolve(process.cwd(), outDir)
    const content = `class PCMProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.bufferSize = 4096;       // batch size before emitting a chunk (reduces WS message frequency)
    this.buffer = new Float32Array(this.bufferSize);
    this.index = 0;
  }

  // Called automatically by the audio thread every ~128 samples (Web Audio API spec).
  process(inputs) {
    const channel = inputs[0]?.[0]; // mono channel of the first input
    if (!channel) return true;      // keep processor alive even if no input yet

    for (let i = 0; i < channel.length; i++) {
      this.buffer[this.index++] = channel[i];

      if (this.index >= this.bufferSize) {
        // Convert Float32 [-1, 1] samples to Int16 PCM, which Gemini Live expects.
        const pcm16 = new Int16Array(this.bufferSize);
        for (let j = 0; j < this.bufferSize; j++) {
          const s = Math.max(-1, Math.min(1, this.buffer[j])); // clamp defensively
          pcm16[j] = s < 0 ? s * 0x8000 : s * 0x7fff;
        }

        // Transfer (not copy) the underlying buffer to the main thread.
        this.port.postMessage(pcm16.buffer, [pcm16.buffer]);

        this.buffer = new Float32Array(this.bufferSize);
        this.index = 0;
      }
    }

    return true; 
  }
}

registerProcessor("pcm-processor", PCMProcessor);
\n`
    ensureAndCreate(targetDir , `audio-processor.js` , content)
}