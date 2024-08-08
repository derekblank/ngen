import { useState, useEffect, useRef } from "react";

const useNoise = (x, y, noiseType) => {
  const [audioContext, setAudioContext] = useState(null);
  const [noiseSource, setNoiseSource] = useState(null);
  const analyserNode = useRef(null);

  const createNoise = (audioCtx, x, y, type) => {
    const bufferSize = 2 * audioCtx.sampleRate;
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const output = buffer.getChannelData(0);

    const randomize = () => (Math.random() * 2 - 1) * (1 - x) * (1 - y);

    if (type === "white") {
      output.set(new Float32Array(bufferSize).map(randomize));
    } else if (type === "pink") {
      let [b0, b1, b2, b3, b4, b5, b6] = Array(7).fill(0);

      output.set(
        new Float32Array(bufferSize).map(() => {
          const white = randomize();
          b0 = 0.99886 * b0 + white * 0.0555179;
          b1 = 0.99332 * b1 + white * 0.0750759;
          b2 = 0.96900 * b2 + white * 0.1538520;
          b3 = 0.86650 * b3 + white * 0.3104856;
          b4 = 0.55000 * b4 + white * 0.5329522;
          b5 = -0.7616 * b5 - white * 0.0168980;
          b6 = white * 0.115926;
          return (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
        })
      );
    } else if (type === "brown") {
      let lastOut = 0.0;

      output.set(
        new Float32Array(bufferSize).map(() => {
          const white = randomize();
          const out = (lastOut + 0.02 * white) / 1.02;
          lastOut = out;
          return out * 3.5;
        })
      );
    }

    const noise = audioCtx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;

    return noise;
  };

  const startNoise = () => {
    if (audioContext && noiseSource) return;

    const newAudioContext = new (window.AudioContext || window.webkitAudioContext)();
    setAudioContext(newAudioContext);

    analyserNode.current = newAudioContext.createAnalyser();
    analyserNode.current.fftSize = 256;

    const newNoiseSource = createNoise(newAudioContext, x, y, noiseType);
    setNoiseSource(newNoiseSource);

    newNoiseSource.connect(analyserNode.current);
    analyserNode.current.connect(newAudioContext.destination);
    newNoiseSource.start();
  };

  const stopNoise = () => {
    if (noiseSource) {
      noiseSource.stop();
      noiseSource.disconnect();
      setNoiseSource(null);
    }
    if (audioContext) {
      audioContext.close();
      setAudioContext(null);
    }
  };

  useEffect(() => {
    return () => {
      stopNoise();
    };
  }, []);

  return {
    startNoise,
    stopNoise,
    analyserNode,
  };
};

export default useNoise;
