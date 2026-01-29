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

    const colors = ['#000000', '#ffffff', '#ff4757', '#2ed573', '#1e90ff', '#eccc68', '#ffa502', '#70a1ff', '#5f6368', '#a4b0be', '#f6b93b', '#e55039'];
    const sizes = [2, 4, 8, 12, 20];

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
                style={{ 
                    cursor: `url("data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMCIgaGVpZ2h0PSIxMCIgdmlld0JveD0iMCAwIDEwIDEwIj48Y2lyY2xlIGN4PSI1IiBjeT0iNSIgcj0iNCIgZmlsbD0icmdiYSgwLDAsMCwwLjUpIi8+PC9zdmc+") 5 5, auto`, 
                    display: 'block' 
                }}
            />
            <div className="whiteboard-tools" style={{
                position: 'absolute', 
                top: '20px', 
                left: '20px',
                display: 'flex', 
                flexDirection: 'column',
                gap: '16px', 
                background: 'rgba(255, 255, 255, 0.9)', 
                backdropFilter: 'blur(10px)',
                padding: '16px',
                borderRadius: '16px', 
                boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
                border: '1px solid rgba(0,0,0,0.05)',
                width: '140px'
            }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                    {colors.map(c => (
                        <button
                            key={c}
                            onClick={() => setColor(c)}
                            style={{
                                width: '24px', 
                                height: '24px', 
                                borderRadius: '50%', 
                                background: c,
                                border: color === c ? '2px solid #1a73e8' : '1px solid #ddd', 
                                cursor: 'pointer'
                            }}
                        />
                    ))}
                </div>
                
                <div style={{ height: '1px', background: '#eee' }}></div>

                <div className="size-selector" style={{ display: 'flex', gap: '4px', justifyContent: 'space-between' }}>
                    {sizes.map(s => (
                        <button key={s} onClick={() => setSize(s)}
                                style={{
                                    width: '20px', height: '20px', borderRadius: '50%', border: size === s ? '2px solid #1a73e8' : '1px solid #ddd',
                                    background: size === s ? '#e8f0fe' : '#fff', cursor: 'pointer', fontSize: '10px'
                                }}>
                            {s}
                        </button>
                    ))}
                </div>

                <button onClick={() => setColor('white')} 
                        style={{ background: color === 'white' ? '#e8f0fe' : '#f8f9fa', border: 'none', padding: '10px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, color: '#5f6368' }}>
                    Eraser
                </button>

                <button onClick={clear} 
                        style={{ background: '#fee2e2', border: 'none', padding: '10px', borderRadius: '8px', cursor: 'pointer', color: '#d93025', fontWeight: 600 }}>
                    Clear All
                </button>
            </div>
        </div>
    );
};

export default Whiteboard;
