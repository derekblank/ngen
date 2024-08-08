import React, { useState, useRef, useEffect } from "react";
import useNoise from "./hooks/useNoise";
import { updateBackgroundColor } from "./util/colors";
import "./App.css";

function App() {
  const [x, setX] = useState(0.5);
  const [y, setY] = useState(0.5);
  const [bgColor, setBgColor] = useState("#b0e0e6");
  const [axisX, setAxisX] = useState(0.5);
  const [axisY, setAxisY] = useState(0.5);
  const [noiseType, setNoiseType] = useState("white");

  const canvasRef = useRef(null);
  const analyserCanvasRef = useRef(null);

  const { startNoise, stopNoise, analyserNode } = useNoise(x, y, noiseType);

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
  }, [analyserNode]);

  useEffect(() => {
    if (analyserNode.current) {
      const ctx = canvasRef.current.getContext("2d");
      const draw = () => {
        const bufferLength = analyserNode.current.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyserNode.current.getByteFrequencyData(dataArray);

        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

        const avgFrequency = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
        const colorValue = Math.min(Math.max(avgFrequency, 0), 255);
        const color = `rgb(${colorValue}, ${255 - colorValue}, 200)`;
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);

        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        for (let i = 0; i < bufferLength; i++) {
          const radius = dataArray[i] / 5;
          const angle = (i / bufferLength) * Math.PI * 2;
          const centerX = canvasRef.current.width / 2 + Math.cos(angle) * radius * 3;
          const centerY = canvasRef.current.height / 2 + Math.sin(angle) * radius * 3;
          ctx.beginPath();
          ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
          ctx.fill();
        }

        requestAnimationFrame(draw);
      };

      draw();
    }
  }, [analyserNode]);

  const handleMouseDown = (e) => {
    updateCanvas(e);
  };

  const handleMouseMove = (e) => {
    updateCanvas(e);
  };

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

    stopNoise();
    startNoise();
  };

  return (
    <div id="container" style={{ backgroundColor: bgColor }}>
      <canvas
        ref={canvasRef}
        id="main-canvas"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={stopNoise}
        onMouseLeave={stopNoise}
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
