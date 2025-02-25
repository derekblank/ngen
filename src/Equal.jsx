import React, { useEffect, useRef, useState } from 'react';

const Equalizer = () => {
	const [isLoading, setIsLoading] = useState(false);
	
	const canvasRef = useRef(null);
	const audioContextRef = useRef(null);
	const analyserRef = useRef(null);
	const sourceRef = useRef(null);
	const animationRef = useRef(null);
	const filtersRef = useRef([]);
	const [isDragging, setIsDragging] = useState(false);
	
	const [bands, setBands] = useState([
		{ frequency: 60, gain: 0, Q: 1 },
		{ frequency: 170, gain: 0, Q: 1 },
		{ frequency: 310, gain: 0, Q: 1 },
		{ frequency: 600, gain: 0, Q: 1 },
		{ frequency: 1000, gain: 0, Q: 1 },
		{ frequency: 3000, gain: 0, Q: 1 },
		{ frequency: 6000, gain: 0, Q: 1 },
		{ frequency: 12000, gain: 0, Q: 1 },
		{ frequency: 16000, gain: 0, Q: 1 }
	]);
	
	const [selectedBand, setSelectedBand] = useState(null);
	const [isPlaying, setIsPlaying] = useState(false);
	const [visualStyle, setVisualStyle] = useState('bars'); 
	
	const [animationProgress, setAnimationProgress] = useState(0);
	const previousBandsRef = useRef([...bands]);

	const audioUpdateRef = useRef(null);

	useEffect(() => {
		audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
		analyserRef.current = audioContextRef.current.createAnalyser();
		analyserRef.current.fftSize = 2048;
		
		// Create filters for each band
		filtersRef.current = bands.map(band => {
			const filter = audioContextRef.current.createBiquadFilter();
			filter.type = 'peaking';
			filter.frequency.value = band.frequency;
			filter.gain.value = band.gain;
			filter.Q.value = band.Q;
			return filter;
		});
		
		// Setup animation frame for smooth EQ transitions - separate from audio processing
		let animationFrameId;
		const animateEQ = () => {
			if (animationProgress < 1) {
				setAnimationProgress(prev => Math.min(prev + 0.1, 1));
				animationFrameId = requestAnimationFrame(animateEQ);
			}
		};

		if (isDragging) {
			animateEQ();
		}

		// Set up canvas to be full screen
		const handleResize = () => {
			if (canvasRef.current) {
				canvasRef.current.width = window.innerWidth;
				canvasRef.current.height = window.innerHeight;
			}
		};
		
		window.addEventListener('resize', handleResize);
		handleResize();
		
		return () => {
			if (animationRef.current) {
				cancelAnimationFrame(animationRef.current);
			}
			if (audioContextRef.current) {
				audioContextRef.current.close();
				if (animationFrameId) {
					cancelAnimationFrame(animationFrameId);
				}
				window.removeEventListener('resize', handleResize);
			}
		};
	}, [isDragging]);

	// Save previous band values when changes occur
	useEffect(() => {
		if (!isDragging) {
			previousBandsRef.current = [...bands];
			setAnimationProgress(0);
		}
	}, [bands, isDragging]);

	const connectFilters = () => {
		if (!sourceRef.current) return;
		
		// Connect source to first filter
		sourceRef.current.connect(filtersRef.current[0]);
		
		// Connect filters in series
		for (let i = 0; i < filtersRef.current.length - 1; i++) {
			filtersRef.current[i].connect(filtersRef.current[i + 1]);
		}
		
		// Connect last filter to analyzer and then to destination
		filtersRef.current[filtersRef.current.length - 1].connect(analyserRef.current);
		analyserRef.current.connect(audioContextRef.current.destination);
	};

	const handleFileUpload = async (file) => {
		if (!file) return;
		
		try {
			setIsLoading(true);
			const arrayBuffer = await file.arrayBuffer();
			const audioBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer);
			
			if (sourceRef.current) {
				sourceRef.current.disconnect();
				sourceRef.current.stop();
			}
			
			sourceRef.current = audioContextRef.current.createBufferSource();
			sourceRef.current.buffer = audioBuffer;
			
			// Connect through the filter chain
			connectFilters();
			
			sourceRef.current.start(0);
			setIsPlaying(true);
			draw();
		} catch (error) {
			console.error('Error loading audio file:', error);
		} finally {
			setIsLoading(false);
		}
	};

	const draw = () => {
		const canvas = canvasRef.current;
		const ctx = canvas.getContext('2d');
		const bufferLength = analyserRef.current.frequencyBinCount;
		const dataArray = new Uint8Array(bufferLength);

		const drawFrame = () => {
			animationRef.current = requestAnimationFrame(drawFrame);
			analyserRef.current.getByteFrequencyData(dataArray);

			ctx.fillStyle = 'rgb(20, 20, 30)';
			ctx.fillRect(0, 0, canvas.width, canvas.height);

			if (visualStyle === 'bars') {
				// Draw frequency bars
				const skipFactor = 8; // Skip frequencies for wider bars
				const usableLength = Math.floor(bufferLength / skipFactor);
				const barWidth = (canvas.width / usableLength) * 0.8; // Fill 80% of space
				const barSpacing = (canvas.width / usableLength) * 0.2; // 20% spacing
				let barHeight;
				let x = 0;

				for (let i = 0; i < bufferLength; i += skipFactor) {
					// Average a group of frequencies for smoother visualization
					let sum = 0;
					for (let j = 0; j < skipFactor && (i + j) < bufferLength; j++) {
						sum += dataArray[i + j];
					}
					const avgValue = sum / skipFactor;
					
					// Control bar height based on average value
					barHeight = avgValue * 1.8; // Scale up height (was / 2, now * 1.8)
					
					// Set colors
					const hue = (avgValue + 30) % 360;
					ctx.fillStyle = `hsl(${hue}, 80%, 50%)`;
					
					// Draw rounded top on bars
					const x2 = x + barWidth;
					const y = canvas.height - barHeight;
					
					// Draw main bar
					ctx.beginPath();
					ctx.moveTo(x, canvas.height);
					ctx.lineTo(x, y + 10);
					ctx.quadraticCurveTo(x, y, x + 10, y);
					ctx.lineTo(x2 - 10, y);
					ctx.quadraticCurveTo(x2, y, x2, y + 10);
					ctx.lineTo(x2, canvas.height);
					ctx.closePath();
					ctx.fill();
					
					// Add glow effect
					ctx.shadowColor = `hsl(${hue}, 90%, 50%)`;
					ctx.shadowBlur = 15;
					ctx.fillRect(x + 2, canvas.height - barHeight + 2, barWidth - 4, 4);
					ctx.shadowBlur = 0;
					
					x += barWidth + barSpacing;
				}
			} else if (visualStyle === 'wave') {
				// Draw waveform
				analyserRef.current.getByteTimeDomainData(dataArray);
				ctx.lineWidth = 2;
				ctx.strokeStyle = 'rgb(120, 220, 255)';
				ctx.beginPath();

				const sliceWidth = canvas.width / bufferLength;
				let x = 0;

				for (let i = 0; i < bufferLength; i++) {
					const v = dataArray[i] / 128.0;
					const y = v * canvas.height / 2;

					if (i === 0) {
						ctx.moveTo(x, y);
					} else {
						ctx.lineTo(x, y);
					}
					x += sliceWidth;
				}
				ctx.stroke();
			} else if (visualStyle === 'eq') {
				// Draw EQ curve and controls
				drawEQCurve(ctx, canvas, dataArray);
			}
		};

		drawFrame();
	};

	// Update drawEQCurve to animate transitions
	const drawEQCurve = (ctx, canvas, dataArray) => {
		// Draw frequency spectrum in background
		const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
		gradient.addColorStop(0, 'rgba(50, 50, 200, 0.2)');
		gradient.addColorStop(1, 'rgba(100, 100, 255, 0)');
		
		ctx.fillStyle = gradient;
		ctx.beginPath();
		ctx.moveTo(0, canvas.height);
		
		for (let i = 0; i < dataArray.length; i++) {
			const x = (i / dataArray.length) * canvas.width;
			const y = canvas.height - (dataArray[i] / 255) * canvas.height;
			ctx.lineTo(x, y);
		}
		
		ctx.lineTo(canvas.width, canvas.height);
		ctx.closePath();
		ctx.fill();
		
		// Calculate interpolated band values for smooth animation
		const interpolatedBands = bands.map((band, index) => {
			const prevBand = previousBandsRef.current[index];
			return {
				...band,
				gain: prevBand && isDragging ? 
					prevBand.gain + (band.gain - prevBand.gain) * animationProgress : 
					band.gain
			};
		});
		
		// Draw EQ curve with interpolated values
		ctx.beginPath();
		ctx.strokeStyle = 'rgb(255, 200, 50)';
		ctx.lineWidth = 2;
		
		// Calculate and draw smooth EQ curve
		const points = interpolatedBands.map(band => {
			const logFreqScale = Math.log10(band.frequency);
			const minLog = Math.log10(20); // 20Hz
			const maxLog = Math.log10(20000); // 20kHz
			const x = ((logFreqScale - minLog) / (maxLog - minLog)) * canvas.width;
			const y = canvas.height / 2 - (band.gain * canvas.height / 40); // Scale gain (-20 to +20)
			return { x, y };
		});
		
		// Draw smooth curve through points
		ctx.moveTo(0, canvas.height / 2);
		
		for (let i = 0; i < points.length; i++) {
			if (i === 0) {
				ctx.lineTo(points[i].x, points[i].y);
			} else {
				// Control points for smooth curve
				const cp1x = (points[i-1].x + points[i].x) / 2;
				const cp1y = points[i-1].y;
				const cp2x = (points[i-1].x + points[i].x) / 2;
				const cp2y = points[i].y;
				ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, points[i].x, points[i].y);
			}
		}
		
		ctx.lineTo(canvas.width, canvas.height / 2);
		ctx.stroke();
		
		// Draw band control points with improved visual feedback
		interpolatedBands.forEach((band, index) => {
			const logFreqScale = Math.log10(band.frequency);
			const minLog = Math.log10(20);
			const maxLog = Math.log10(20000);
			const x = ((logFreqScale - minLog) / (maxLog - minLog)) * canvas.width;
			const y = canvas.height / 2 - (band.gain * canvas.height / 40);
			
			// Highlight selected band
			if (selectedBand === index) {
				// Add shadow effect for dragging feedback
				if (isDragging) {
					ctx.shadowColor = 'rgba(255, 100, 50, 0.8)';
					ctx.shadowBlur = 15;
				}
				
				ctx.fillStyle = 'rgb(255, 255, 255)';
				ctx.strokeStyle = 'rgb(255, 100, 50)';
				ctx.lineWidth = 3;
				ctx.beginPath();
				ctx.arc(x, y, 10, 0, Math.PI * 2);
				ctx.fill();
				ctx.stroke();
				
				// Reset shadow
				ctx.shadowColor = 'transparent';
				ctx.shadowBlur = 0;
				
				// Draw frequency label
				ctx.fillStyle = 'white';
				ctx.font = '12px Arial';
				ctx.fillText(`${band.frequency}Hz: ${band.gain.toFixed(1)}dB`, x + 15, y - 10);
			} else {
				ctx.fillStyle = 'rgb(255, 220, 100)';
				ctx.beginPath();
				ctx.arc(x, y, 6, 0, Math.PI * 2);
				ctx.fill();
			}
		});
	};

	const handleCanvasClick = (e) => {
		if (visualStyle !== 'eq') return;
		
		const canvas = canvasRef.current;
		const rect = canvas.getBoundingClientRect();
		const x = e.clientX - rect.left;
		const y = e.clientY - rect.top;
		
		const clickedBandIndex = bands.findIndex((band, index) => {
			const logFreqScale = Math.log10(band.frequency);
			const minLog = Math.log10(20);
			const maxLog = Math.log10(20000);
			const bandX = ((logFreqScale - minLog) / (maxLog - minLog)) * canvas.width;
			const bandY = canvas.height / 2 - (band.gain * canvas.height / 40);
			
			const distance = Math.sqrt(Math.pow(bandX - x, 2) + Math.pow(bandY - y, 2));
			return distance < 10;
		});
		
		try {
			if (clickedBandIndex !== -1) {
				setSelectedBand(clickedBandIndex);
				setIsDragging(true);
			} else {
				const minLog = Math.log10(20);
				const maxLog = Math.log10(20000);
				const logFreq = minLog + (x / canvas.width) * (maxLog - minLog);
				const frequency = Math.pow(10, logFreq);
				
				let closestBandIndex = 0;
				let closestDistance = Math.abs(bands[0].frequency - frequency);
				
				for (let i = 1; i < bands.length; i++) {
					const distance = Math.abs(bands[i].frequency - frequency);
					if (distance < closestDistance) {
						closestDistance = distance;
						closestBandIndex = i;
					}
				}
				
				const gain = -((y - canvas.height / 2) / (canvas.height / 40));
				const limitedGain = Math.max(Math.min(gain, 12), -12);
				
				const newBands = [...bands];
				newBands[closestBandIndex] = {
					...newBands[closestBandIndex],
					gain: limitedGain
				};
				
				setBands(newBands);
				
				updateFilterGain(closestBandIndex, limitedGain);
				
				setSelectedBand(closestBandIndex);
				setIsDragging(true);
			}
		} catch (err) {
			console.error("Error in canvas click handler:", err);
		}
	};

	const handleCanvasMove = (e) => {
		if (!isDragging || selectedBand === null || visualStyle !== 'eq') return;
		
		const canvas = canvasRef.current;
		const rect = canvas.getBoundingClientRect();
		const y = e.clientY - rect.top;
		
		const newGain = -((y - canvas.height / 2) / (canvas.height / 40));
		
		const limitedGain = Math.max(Math.min(newGain, 12), -12);
		
		const newBands = [...bands];
		newBands[selectedBand] = {
			...newBands[selectedBand],
			gain: limitedGain
		};
		
		setBands(newBands);
		
		 // Use debounced filter update to avoid overwhelming the audio thread
		if (!audioUpdateRef.current) {
			audioUpdateRef.current = setTimeout(() => {
				updateFilterGain(selectedBand, limitedGain);
				audioUpdateRef.current = null;
			}, 10); 
		}
	};

	const handleCanvasRelease = () => {
		if (audioUpdateRef.current) {
			clearTimeout(audioUpdateRef.current);
			audioUpdateRef.current = null;
		}
		
		setSelectedBand(null);
		setIsDragging(false);
	};

	const handleMouseDown = (e) => {
		handleCanvasClick(e);
	};

	const handleDragOver = (e) => {
		e.preventDefault();
	};

	const handleDrop = (e) => {
		e.preventDefault();
		const file = e.dataTransfer.files[0];
		if (file && file.type.startsWith('audio/')) {
			handleFileUpload(file);
		}
	};

	const handleStyleChange = (style) => {
		setVisualStyle(style);
	};

	const resetEQ = () => {
		const newBands = bands.map(band => ({ ...band, gain: 0 }));
		setBands(newBands);
		
		filtersRef.current.forEach(filter => {
			filter.gain.value = 0;
		});
	};

	const updateFilterGain = (filterIndex, gainValue) => {
		try {
			if (filtersRef.current[filterIndex] && audioContextRef.current) {
				const now = audioContextRef.current.currentTime;
				filtersRef.current[filterIndex].gain.cancelScheduledValues(now);
				filtersRef.current[filterIndex].gain.setValueAtTime(filtersRef.current[filterIndex].gain.value, now);
				filtersRef.current[filterIndex].gain.linearRampToValueAtTime(gainValue, now + 0.05);
			}
		} catch (err) {
			console.error("Error updating filter gain:", err);
		}
	};

	return (
		<div
			className="equalizer-container"
			style={{
				position: 'fixed',
				top: 0,
				left: 0,
				right: 0,
				bottom: 0,
				width: '100vw',
				height: '100vh',
				margin: 0,
				padding: 0,
				overflow: 'hidden',
				userSelect: 'none',
				backgroundColor: 'rgb(20, 20, 30)'
			}}
		>
			{isLoading && (
				<div style={{
					position: 'absolute',
					top: '50%',
					left: '50%',
					transform: 'translate(-50%, -50%)',
					zIndex: 10,
					backgroundColor: 'rgba(0, 0, 0, 0.7)',
					borderRadius: '8px',
					padding: '20px',
					display: 'flex',
					flexDirection: 'column',
					alignItems: 'center'
				}}>
					<div style={{
						border: '4px solid rgba(255, 255, 255, 0.3)',
						borderTop: '4px solid #ffffff',
						borderRadius: '50%',
						width: '40px',
						height: '40px',
						animation: 'spin 1s linear infinite'
					}} />
					<p style={{ color: 'white', marginTop: '10px' }}>Loading audio...</p>
					<style>{`
						@keyframes spin {
							0% { transform: rotate(0deg); }
							100% { transform: rotate(360deg); }
						}
					`}</style>
				</div>
			)}
			
			<canvas 
				ref={canvasRef} 
				style={{ 
					display: 'block',
					width: '100%',
					height: '100%',
					cursor: visualStyle === 'eq' ? (isDragging ? 'grabbing' : 'grab') : 'default'
				}}
				onMouseDown={handleMouseDown}
				onMouseMove={handleCanvasMove}
				onMouseUp={handleCanvasRelease}
				onMouseLeave={handleCanvasRelease}
				onDragOver={handleDragOver}
				onDrop={handleDrop}
			/>
			
			<div style={{
				position: 'absolute',
				top: '20px',
				left: '20px',
				color: '#fff',
				zIndex: 5
			}}>
				<h3 style={{ margin: 0 }}>Audio Equalizer</h3>
			</div>
			
			{isPlaying && (
				<div style={{ 
					position: 'absolute', 
					top: '20px', 
					right: '20px', 
					backgroundColor: 'rgba(0, 200, 0, 0.3)',
					color: 'white',
					padding: '5px 10px',
					borderRadius: '4px',
					fontSize: '12px',
					zIndex: 5
				}}>
					▶ Playing
				</div>
			)}
			
			<div style={{ 
				position: 'absolute',
				bottom: '20px',
				left: '20px',
				right: '20px',
				display: 'flex',
				justifyContent: 'space-between',
				alignItems: 'center',
				padding: '10px 20px',
				backgroundColor: 'rgba(20, 20, 30, 0.8)',
				borderRadius: '8px',
				zIndex: 5
			}}>
				<input
					type="file"
					accept="audio/*"
					onChange={(e) => handleFileUpload(e.target.files[0])}
					style={{ color: '#fff' }}
					disabled={isLoading}
				/>
				<div>
					<button 
						onClick={() => handleStyleChange('bars')} 
						style={{ marginRight: '5px', backgroundColor: visualStyle === 'bars' ? '#555' : '#333', color: '#fff', border: 'none', padding: '5px 10px', borderRadius: '4px' }}
					>
						Bars
					</button>
					<button 
						onClick={() => handleStyleChange('wave')} 
						style={{ marginRight: '5px', backgroundColor: visualStyle === 'wave' ? '#555' : '#333', color: '#fff', border: 'none', padding: '5px 10px', borderRadius: '4px' }}
					>
						Wave
					</button>
					<button 
						onClick={() => handleStyleChange('eq')} 
						style={{ marginRight: '5px', backgroundColor: visualStyle === 'eq' ? '#555' : '#333', color: '#fff', border: 'none', padding: '5px 10px', borderRadius: '4px' }}
					>
						EQ
					</button>
					<button 
						onClick={resetEQ} 
						style={{ backgroundColor: '#444', color: '#fff', border: 'none', padding: '5px 10px', borderRadius: '4px' }}
					>
						Reset EQ
					</button>
				</div>
			</div>
			
			<div style={{ 
				position: 'absolute',
				bottom: '80px',
				left: '50%',
				transform: 'translateX(-50%)',
				fontSize: '12px',
				color: '#aaa',
				textAlign: 'center',
				backgroundColor: 'rgba(0,0,0,0.5)',
				padding: '5px 10px',
				borderRadius: '4px',
				zIndex: 5
			}}>
				{visualStyle === 'eq' ? 'Click on frequency points and drag vertically to adjust gain • ' : ''}
				Drop audio files here
			</div>
		</div>
	);
};

export default Equalizer;
