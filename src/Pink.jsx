import { useState, useRef, useEffect } from "react";
import { updateBackgroundColor, hexToRgb } from "./util/colors";
import "./Pink.css";

function Pink() {
  const [audioContext, setAudioContext] = useState(null);
  const [noiseSource, setNoiseSource] = useState(null);
  const [gainNode, setGainNode] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [x, setX] = useState(0.5);
  const [y, setY] = useState(0.5);
  const [bgColor, setBgColor] = useState("#b0e0e6");
  const [volume, setVolume] = useState(0.5); // Default volume

  const canvasRef = useRef(null);
  const analyserNode = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", handleResize);
    handleResize();
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (audioContext && analyserNode.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      const draw = () => {
        if (!analyserNode.current) return;

        const bufferLength = analyserNode.current.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyserNode.current.getByteFrequencyData(dataArray);

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const max = Math.max(...dataArray);
        const intensity = max / 255;
        const color = hexToRgb(updateBackgroundColor(intensity));

        ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${intensity})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        requestAnimationFrame(draw);
      };

      draw();
    }
  }, [x, y, bgColor]);

  const createPinkNoise = (audioCtx, x, y) => {
    const bufferSize = 2 * audioCtx.sampleRate;
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const output = buffer.getChannelData(0);

    let b0, b1, b2, b3, b4, b5, b6;
    b0 = b1 = b2 = b3 = b4 = b5 = b6 = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      output[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
      output[i] *= 0.11;
      b6 = white * 0.115926;
    }

    const noise = audioCtx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;

    return noise;
  };

  const startNoise = () => {
    if (audioContext && noiseSource) {
      // If a noise source is already active, do nothing.
      return;
    }

    if (!audioContext) {
      const newAudioContext = new (window.AudioContext)();
      setAudioContext(newAudioContext);
      analyserNode.current = newAudioContext.createAnalyser();
      analyserNode.current.fftSize = 256;

      const newGainNode = newAudioContext.createGain();
      newGainNode.gain.value = volume;
      setGainNode(newGainNode);

      const newNoiseSource = createPinkNoise(newAudioContext, x, y);
      setNoiseSource(newNoiseSource);
      newNoiseSource.connect(analyserNode.current);
      analyserNode.current.connect(newGainNode);
      newGainNode.connect(newAudioContext.destination);
      newNoiseSource.start();
    } else {
      const newGainNode = audioContext.createGain();
      newGainNode.gain.value = volume;
      setGainNode(newGainNode);

      const newNoiseSource = createPinkNoise(audioContext, x, y);
      setNoiseSource(newNoiseSource);
      newNoiseSource.connect(analyserNode.current);
      analyserNode.current.connect(newGainNode);
      newGainNode.connect(audioContext.destination);
      newNoiseSource.start();
    }
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

  const handleMouseDown = (e) => {
    setDragging(true);
    updateCanvas(e);
  };

  const handleMouseMove = (e) => {
    if (dragging) {
      updateCanvas(e);
    }
  };

  const handleMouseUp = () => setDragging(false);

  const updateCanvas = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const newX = (e.clientX - rect.left) / rect.width;
    const newY = (e.clientY - rect.top) / rect.height;
    setX(newX);
    setY(newY);

    const newBgColor = updateBackgroundColor(newX);
    setBgColor(newBgColor);

    if (noiseSource) {
      noiseSource.stop();
      const newNoiseSource = createPinkNoise(audioContext, newX, newY);
      setNoiseSource(newNoiseSource);
      newNoiseSource.connect(analyserNode.current);
      analyserNode.current.connect(audioContext.destination);
      newNoiseSource.start();
    }
  };

  const handleVolumeChange = (e) => {
    const newVolume = e.target.value;
    setVolume(newVolume);
    if (gainNode) {
      gainNode.gain.value = newVolume;
    }
  };

  return (
    <div id="container" style={{ backgroundColor: bgColor }}>
      <canvas
        ref={canvasRef}
        id="main-canvas"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      />
      <div id="info">
        <p>Pointer Position: x={x.toFixed(2)}, y={y.toFixed(2)}</p>
        <div id="controls">
          <button onClick={startNoise}>Start Noise</button>
          <button onClick={stopNoise}>Stop Noise</button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onChange={handleVolumeChange}
          />
        </div>
      </div>
      <div className="horizontal-line" style={{ top: `${y * 100}%` }} />
      <div className="vertical-line" style={{ left: `${x * 100}%` }} />
    </div>
  );
}

export default Pink;
