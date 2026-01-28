import React, { useRef, useEffect, useState } from 'react';

const Whiteboard = ({ socket, roomId }) => {
    const canvasRef = useRef(null);
    const [color, setColor] = useState('white');
    const [size, setSize] = useState(3);
    const isDrawing = useRef(false);
    const lastPos = useRef({ x: 0, y: 0 });

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        // Resize canvas to fit container
        const resizeCanvas = () => {
            const parent = canvas.parentElement;
            canvas.width = parent.clientWidth;
            canvas.height = parent.clientHeight;
            // Re-fetch existing board state from socket
            if (socket) socket.emit('getCanvas');
        };

        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);

        if (socket) {
            socket.on('draw', (newx, newy, prevx, prevy, drawColor, drawSize) => {
                drawLine(prevx * canvas.width, prevy * canvas.height, newx * canvas.width, newy * canvas.height, drawColor, drawSize, false);
            });

            socket.on('clearBoard', () => {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
            });

            socket.on('getCanvas', (url) => {
                const img = new Image();
                img.onload = () => ctx.drawImage(img, 0, 0);
                img.src = url;
            });
        }

        return () => {
            window.removeEventListener('resize', resizeCanvas);
            if (socket) {
                socket.off('draw');
                socket.off('clearBoard');
                socket.off('getCanvas');
            }
        };
    }, [socket]);

    const drawLine = (x1, y1, x2, y2, drawColor, drawSize, emit = true) => {
        const ctx = canvasRef.current.getContext('2d');
        ctx.beginPath();
        ctx.strokeStyle = drawColor;
        ctx.lineWidth = drawSize;
        ctx.lineCap = 'round';
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        ctx.closePath();

        if (emit && socket) {
            const w = canvasRef.current.width;
            const h = canvasRef.current.height;
            socket.emit('draw', x2 / w, y2 / h, x1 / w, y1 / h, drawColor, drawSize);
            socket.emit('store canvas', canvasRef.current.toDataURL());
        }
    };

    const startDrawing = (e) => {
        isDrawing.current = true;
        lastPos.current = { x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY };
    };

    const draw = (e) => {
        if (!isDrawing.current) return;
        const newPos = { x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY };
        drawLine(lastPos.current.x, lastPos.current.y, newPos.x, newPos.y, color, size);
        lastPos.current = newPos;
    };

    const stopDrawing = () => {
        isDrawing.current = false;
    };

    const clear = () => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        if (socket) socket.emit('clearBoard');
    };

    const colors = ['#ffffff', '#ff4757', '#2ed573', '#1e90ff', '#eccc68', '#ffa502', '#70a1ff', '#ced6e0'];

    return (
        <div className="whiteboard-wrapper" style={{ 
            width: '100%', 
            height: '100%', 
            position: 'relative', 
            background: '#ffffff', 
            borderRadius: '8px', 
            overflow: 'hidden',
            boxShadow: 'inset 0 0 20px rgba(0,0,0,0.05)'
        }}>
            <canvas
                ref={canvasRef}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseOut={stopDrawing}
                style={{ cursor: 'crosshair', display: 'block' }}
            />
            <div className="whiteboard-tools" style={{
                position: 'absolute', 
                top: '20px', 
                left: '20px',
                display: 'flex', 
                flexDirection: 'column',
                gap: '12px', 
                background: 'white', 
                padding: '12px',
                borderRadius: '8px', 
                boxShadow: '0 1px 3px rgba(60,64,67,0.3), 0 4px 8px 3px rgba(60,64,67,0.15)',
                border: '1px solid #e8eaed'
            }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                    {colors.map(c => (
                        <button
                            key={c}
                            onClick={() => setColor(c)}
                            title={`Color: ${c}`}
                            style={{
                                width: '28px', 
                                height: '28px', 
                                borderRadius: '4px', 
                                background: c,
                                border: color === c ? '2px solid #1a73e8' : '1px solid #dadce0', 
                                cursor: 'pointer',
                                transition: 'transform 0.1s'
                            }}
                            onMouseOver={(e) => e.target.style.transform = 'scale(1.1)'}
                            onMouseOut={(e) => e.target.style.transform = 'scale(1.0)'}
                        />
                    ))}
                </div>
                <div style={{ height: '1px', background: '#e8eaed' }}></div>
                <button 
                    onClick={() => setColor('#ffffff')} 
                    className="tool-btn" 
                    style={{ 
                        background: color === '#ffffff' ? '#e8f0fe' : 'none', 
                        border: 'none', 
                        padding: '8px',
                        borderRadius: '4px',
                        color: color === '#ffffff' ? '#1a73e8' : '#5f6368', 
                        cursor: 'pointer',
                        fontSize: '0.8rem',
                        fontWeight: 600
                    }}
                >
                    Eraser
                </button>
                <button 
                    onClick={clear} 
                    className="tool-btn" 
                    style={{ 
                        background: 'none', 
                        border: 'none', 
                        padding: '8px',
                        borderRadius: '4px',
                        color: '#d93025', 
                        cursor: 'pointer',
                        fontSize: '0.8rem',
                        fontWeight: 600
                    }}
                >
                    Clear
                </button>
            </div>
        </div>
    );
};

export default Whiteboard;
