class MidProcessor extends AudioWorkletProcessor {
  process(inputs, outputs, parameters) {
    const input = inputs[0];  // Input: an array of input channels
    const output = outputs[0]; // Output: an array of output channels

    const left = input[0];
    const right = input[1];

    // Mix both channels into mono (as you did with ScriptProcessorNode)
    for (let i = 0; i < left.length; i++) {
      output[0][i] = (left[i] + right[i]) / 2;  // Left channel to output
      output[1][i] = (left[i] + right[i]) / 2;  // Right channel to output
    }

    // Returning true ensures that the AudioWorkletProcessor keeps processing
    return true;
  }
}

// Register the AudioWorkletProcessor under the name 'mid-processor'
registerProcessor('mid-processor', MidProcessor);
