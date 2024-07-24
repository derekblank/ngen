import { useState, useRef, useEffect } from "react";
import "./App.css";

function App() {
  const [audioContext, setAudioContext] = useState(null);
  const [noiseSource, setNoiseSource] = useState(null);
  const canvasRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [x, setX] = useState(0.5);
  const [y, setY] = useState(0.5);
  const [bgColor, setBgColor] = useState("#b0e0e6");
  const [axisX, setAxisX] = useState(0.5);
  const [axisY, setAxisY] = useState(0.5);

  function createNoise(audioCtx, x, y) {
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
  }

  function startNoise() {
    if (!audioContext) {
      const newAudioContext = new (window.AudioContext)();
      setAudioContext(newAudioContext);
      const newNoiseSource = createNoise(newAudioContext, x, y);
      setNoiseSource(newNoiseSource);
      newNoiseSource.connect(newAudioContext.destination);
      newNoiseSource.start();
    } else {
      const newNoiseSource = createNoise(audioContext, x, y);
      setNoiseSource(newNoiseSource);
      newNoiseSource.connect(audioContext.destination);
      newNoiseSource.start();
    }
  }

  function stopNoise() {
    if (noiseSource) {
      noiseSource.stop();
      noiseSource.disconnect();
      setNoiseSource(null);
    }
    if (audioContext) {
      audioContext.close();
      setAudioContext(null);
    }
  }

  function handleMouseDown(e) {
    setDragging(true);
    updateCanvas(e);
  }

  function handleMouseMove(e) {
    if (dragging) {
      updateCanvas(e);
    }
  }

  function handleMouseUp() {
    setDragging(false);
  }

  function updateCanvas(e) {
    const rect = canvasRef.current.getBoundingClientRect();
    const newX = (e.clientX - rect.left) / rect.width;
    const newY = (e.clientY - rect.top) / rect.height;
    setX(newX);
    setY(newY);

    setAxisX(newX);
    setAxisY(newY);

    const pastelColors = [
      "#b0e0e6",
      "#add8e6",
      "#87cefa",
      "#b0c4de",
      "#afeeee",
      "#e0ffff",
    ];
    const colorIndex = newX * (pastelColors.length - 1);
    const lowerIndex = Math.floor(colorIndex);
    const upperIndex = Math.ceil(colorIndex);
    const blend = colorIndex - lowerIndex;

    const color1 = hexToRgb(pastelColors[lowerIndex]);
    const color2 = hexToRgb(pastelColors[upperIndex]);
    const blendedColor = {
      r: Math.round(color1.r * (1 - blend) + color2.r * blend),
      g: Math.round(color1.g * (1 - blend) + color2.g * blend),
      b: Math.round(color1.b * (1 - blend) + color2.b * blend),
    };

    setBgColor(`rgb(${blendedColor.r}, ${blendedColor.g}, ${blendedColor.b})`);

    if (noiseSource) {
      noiseSource.stop();
      const newNoiseSource = createNoise(audioContext, newX, newY);
      setNoiseSource(newNoiseSource);
      newNoiseSource.connect(audioContext.destination);
      newNoiseSource.start();
    }
  }

  function hexToRgb(hex) {
    const bigint = parseInt(hex.slice(1), 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return { r, g, b };
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  useEffect(() => {
    let animationFrameId;

    const update = () => {
      if (dragging) {
        setAxisX(x);
        setAxisY(y);
        animationFrameId = requestAnimationFrame(update);
      }
    };

    update();

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [dragging, x, y]);

  return (
    <div className="container" style={{ backgroundColor: bgColor }}>
      <canvas
        ref={canvasRef}
        style={{ width: "100%", height: "100%" }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      ></canvas>
      <div style={{ position: "fixed", bottom: 10, left: 10 }}>
        <p>Pointer Position: x={x.toFixed(2)}, y={y.toFixed(2)}</p>
      </div>
      <div style={{ position: "fixed", bottom: 10, right: 10 }}>
        <button onClick={startNoise} style={{ marginRight: 10 }}>Start Noise</button>
        <button onClick={stopNoise}>Stop Noise</button>
      </div>
      <div
        style={{
          position: "fixed",
          top: `${axisY * 100}%`,
          left: "0",
          right: "0",
          height: "1px",
          backgroundColor: "#333",
          transition: "top 0.1s ease",
        }}
      />
      <div
        style={{
          position: "fixed",
          left: `${axisX * 100}%`,
          top: "0",
          bottom: "0",
          width: "1px",
          backgroundColor: "#333",
          transition: "left 0.1s ease",
        }}
      />
    </div>
  );
}

export default App;
