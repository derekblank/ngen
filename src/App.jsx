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
  const [noiseType, setNoiseType] = useState("white"); // New state for noise type

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

  const createNoise = (audioCtx, type) => {
    const bufferSize = 2 * audioCtx.sampleRate;
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const output = buffer.getChannelData(0);

    if (type === "white") {
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }
    } else if (type === "pink") {
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
        output[i] *= 0.11; // (roughly) compensate for gain
        b6 = white * 0.115926;
      }
    } else if (type === "brown") {
      let lastOut = 0.0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        output[i] = (lastOut + (0.02 * white)) / 1.02;
        lastOut = output[i];
        output[i] *= 3.5; // (roughly) compensate for gain
      }
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

      const newNoiseSource = createNoise(newAudioContext, noiseType);
      setNoiseSource(newNoiseSource);
      newNoiseSource.connect(analyserNode.current);
      analyserNode.current.connect(newAudioContext.destination);
      newNoiseSource.start();
    } else {
      const newNoiseSource = createNoise(audioContext, noiseType);
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
      const newNoiseSource = createNoise(audioContext, noiseType);
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
          <select onChange={(e) => setNoiseType(e.target.value)} value={noiseType}>
            <option value="white">White Noise</option>
            <option value="pink">Pink Noise</option>
            <option value="brown">Brown Noise</option>
          </select>
        </div>
      </div>
      <div className="horizontal-line" style={{ top: `${axisY * 100}%` }} />
      <div className="vertical-line" style={{ left: `${axisX * 100}%` }} />
    </div>
  );
}

export default App;
