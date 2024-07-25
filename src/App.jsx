import { useState, useRef, useEffect } from "react";
import { updateBackgroundColor, hexToRgb } from "./util/colors";
import "./App.css";

function App() {
  const [audioContext, setAudioContext] = useState(null);
  const [noiseSource, setNoiseSource] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [x, setX] = useState(0.5);
  const [y, setY] = useState(0.5);
  const [bgColor, setBgColor] = useState("#b0e0e6");
  const [axisX, setAxisX] = useState(0.5);
  const [axisY, setAxisY] = useState(0.5);

  const canvasRef = useRef(null);
  const analyserCanvasRef = useRef(null);
  const analyserNode = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", handleResize);
    handleResize(); // Set initial size
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (analyserCanvasRef.current && analyserNode.current) {
      const analyserCtx = analyserCanvasRef.current.getContext("2d");
      analyserCanvasRef.current.width = window.innerWidth;
      analyserCanvasRef.current.height = 200;

      const drawSpectrum = () => {
        if (analyserNode.current) {
          const bufferLength = analyserNode.current.frequencyBinCount;
          const dataArray = new Uint8Array(bufferLength);
          analyserNode.current.getByteFrequencyData(dataArray);

          analyserCtx.clearRect(0, 0, analyserCanvasRef.current.width, analyserCanvasRef.current.height);

          const barWidth = analyserCanvasRef.current.width / bufferLength;
          let barHeight;
          let x = 0;

          for (let i = 0; i < bufferLength; i++) {
            barHeight = dataArray[i] / 2;
            analyserCtx.fillStyle = `rgb(${barHeight + 100}, 150, 150)`;
            analyserCtx.fillRect(x, analyserCanvasRef.current.height - barHeight, barWidth, barHeight);
            x += barWidth + 1;
          }
        }
        requestAnimationFrame(drawSpectrum);
      };

      drawSpectrum();
    }
  }, [noiseSource]);

  const createNoise = (audioCtx, x, y) => {
    const bufferSize = 2 * audioCtx.sampleRate;
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const output = buffer.getChannelData(0);

    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      let brown = (lastOut + (0.02 * white)) / 1.02;
      lastOut = brown;
      brown *= 0.5;

      output[i] = white * (1 - x) + brown * x;
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

      const newNoiseSource = createNoise(newAudioContext, x, y);
      setNoiseSource(newNoiseSource);
      newNoiseSource.connect(analyserNode.current);
      analyserNode.current.connect(newAudioContext.destination);
      newNoiseSource.start();
    } else {
      const newNoiseSource = createNoise(audioContext, x, y);
      setNoiseSource(newNoiseSource);
      newNoiseSource.connect(analyserNode.current);
      analyserNode.current.connect(audioContext.destination);
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
    setAxisX(newX);
    setAxisY(newY);

    const newBgColor = updateBackgroundColor(newX);
    setBgColor(newBgColor);

    if (noiseSource) {
      noiseSource.stop();
      const newNoiseSource = createNoise(audioContext, newX, newY);
      setNoiseSource(newNoiseSource);
      newNoiseSource.connect(analyserNode.current);
      analyserNode.current.connect(audioContext.destination);
      newNoiseSource.start();
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
      <canvas
        ref={analyserCanvasRef}
        id="analyser-canvas"
      />
      <div id="info">
        <p>Pointer Position: x={x.toFixed(2)}, y={y.toFixed(2)}</p>
        <div id="controls">
          <button onClick={startNoise}>Start Noise</button>
          <button onClick={stopNoise}>Stop Noise</button>
        </div>
      </div>
      <div className="horizontal-line" style={{ top: `${axisY * 100}%` }} />
      <div className="vertical-line" style={{ left: `${axisX * 100}%` }} />
    </div>
  );
}

export default App;
