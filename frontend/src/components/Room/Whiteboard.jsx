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
        <div className="whiteboard-wrapper" style={{ width: '100%', height: '100%', position: 'relative', background: '#1e293b', borderRadius: '16px', overflow: 'hidden' }}>
            <canvas
                ref={canvasRef}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseOut={stopDrawing}
                style={{ cursor: 'crosshair', display: 'block' }}
            />
            <div className="whiteboard-tools" style={{
                position: 'absolute', bottom: '20px', left: '50%', transform: 'translateX(-50%)',
                display: 'flex', gap: '10px', background: 'rgba(0,0,0,0.6)', padding: '10px',
                borderRadius: '30px', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)'
            }}>
                {colors.map(c => (
                    <button
                        key={c}
                        onClick={() => setColor(c)}
                        style={{
                            width: '24px', height: '24px', borderRadius: '50%', background: c,
                            border: color === c ? '2px solid white' : 'none', cursor: 'pointer'
                        }}
                    />
                ))}
                <div style={{ width: '1px', background: 'rgba(255,255,255,0.2)', margin: '0 5px' }}></div>
                <button onClick={() => setColor('#1e293b')} className="tool-btn" style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}>Eraser</button>
                <button onClick={clear} className="tool-btn" style={{ background: 'none', border: 'none', color: '#ff4757', cursor: 'pointer' }}>Clear</button>
            </div>
        </div>
    );
};

export default Whiteboard;
