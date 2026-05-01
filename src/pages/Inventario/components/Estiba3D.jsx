import React from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Box, Grid, Cylinder } from '@react-three/drei';

const Estiba3D = ({ modoOrigen, frente, fondo, niveles, pzCama, tarimas, piezasVisuales, huecos3D, onToggleHueco }) => {
  const cajas = [];
  const boxSize = 1;
  const gap = 0.05;

  const n = Math.max(1, parseInt(niveles) || 1);
  const t = Math.max(1, parseInt(tarimas) || 1);

  // Función auxiliar para renderizar con material "fantasma" si es un hueco
  const renderMaterial = (forma, isHueco) => {
    if (isHueco) {
      // Caja transparente roja que representa el hueco (puedes volver a tocarla para restaurar)
      return <meshStandardMaterial color="#ef4444" transparent opacity={0.3} depthWrite={false} />;
    }
    
    if (forma === 'circulo') return <meshStandardMaterial color="#f59e0b" roughness={0.3} metalness={0.2} />;
    if (forma === 'cama') return <meshStandardMaterial color="#8b5cf6" roughness={0.2} metalness={0.1} />;
    if (forma === 'bloque') return <meshStandardMaterial color="#10b981" roughness={0.2} metalness={0.1} />;
    
    // Por defecto: Caja azul estándar (cuadrado y rectángulos)
    return <meshStandardMaterial color="#3b82f6" roughness={0.2} metalness={0.1} />;
  };

  // ==========================================
  // ESCENARIO 1: AFINACIÓN MILIMÉTRICA DEL LIENZO
  // ==========================================
  if (modoOrigen === 'visual' && piezasVisuales && piezasVisuales.length > 0) {
    const scale = 34; // Exactamente el ancho de tu círculo/cuadrado en CSS
    const offsetX = 5; // Centro del lienzo en X (aprox 170px / 34)
    const offsetZ = 2.5; // Centro del lienzo en Y (aprox 85px / 34)

    for (let tarima = 0; tarima < t; tarima++) {
      for (let y = 0; y < n; y++) {
        piezasVisuales.forEach((p, index) => {
          
          // Calculamos el centro exacto de la figura CSS para mapearlo a 3D
          const isRectH = p.forma === 'rectangulo-h';
          const isRectV = p.forma === 'rectangulo-v';
          const wPx = isRectH ? 68 : 34;
          const dPx = isRectV ? 68 : 34;
          
          const cx = p.x + (wPx / 2);
          const cy = p.y + (dPx / 2);

          const x3D = (cx / scale) - offsetX;
          const z3D = (cy / scale) - offsetZ + (tarima * 3); // 3 unidades de separación entre tarimas
          const posY = y * (boxSize + gap) + 0.5;
          const key = `lienzo-${tarima}-${y}-${index}`;
          const isHueco = huecos3D.includes(key);

          const propsInteractivos = {
            key: key,
            position: [x3D, posY, z3D],
            onClick: (e) => { e.stopPropagation(); onToggleHueco(key); }
          };

          if (p.forma === 'circulo') {
            cajas.push(
              <Cylinder {...propsInteractivos} args={[0.5, 0.5, 1, 32]}>
                {renderMaterial('circulo', isHueco)}
              </Cylinder>
            );
          } else {
            cajas.push(
              <Box {...propsInteractivos} args={[isRectH ? 2 : 1, 1, isRectV ? 2 : 1]}>
                {renderMaterial('caja', isHueco)}
              </Box>
            );
          }
        });
      }
    }
  } 
  // ==========================================
  // ESCENARIO 2: CAMA NUMÉRICA
  // ==========================================
  else if (modoOrigen === 'cama' && parseInt(pzCama) > 0) {
    const pz = parseInt(pzCama);
    const cols = Math.ceil(Math.sqrt(pz));
    const offsetX = (cols * (boxSize + gap)) / 2 - (boxSize / 2);

    for (let tarima = 0; tarima < t; tarima++) {
      for (let y = 0; y < n; y++) {
        for (let i = 0; i < pz; i++) {
          const col = i % cols;
          const row = Math.floor(i / cols);
          const offsetZ = (Math.ceil(pz/cols) * (boxSize + gap)) / 2 - (boxSize / 2);
          
          const key = `cama-${tarima}-${y}-${i}`;
          const isHueco = huecos3D.includes(key);

          cajas.push(
            <Box 
              key={key} 
              position={[col * (boxSize + gap) - offsetX, y * (boxSize+gap) + 0.5, row * (boxSize + gap) - offsetZ + (tarima * 4)]}
              onClick={(e) => { e.stopPropagation(); onToggleHueco(key); }}
            >
              {renderMaterial('cama', isHueco)}
            </Box>
          );
        }
      }
    }
  } 
  // ==========================================
  // ESCENARIO 3: BLOQUE BÁSICO
  // ==========================================
  else {
    const f = Math.max(1, parseInt(frente) || 1);
    const d = Math.max(1, parseInt(fondo) || 1);
    const offsetX = (f * (boxSize + gap)) / 2 - (boxSize / 2);
    const offsetZ = (d * (boxSize + gap)) / 2 - (boxSize / 2);

    for (let y = 0; y < n; y++) {
      for (let x = 0; x < f; x++) {
        for (let z = 0; z < d; z++) {
          const key = `bloque-${x}-${y}-${z}`;
          const isHueco = huecos3D.includes(key);

          cajas.push(
            <Box 
              key={key} 
              position={[x * (boxSize + gap) - offsetX, y * (boxSize + gap) + 0.5, z * (boxSize + gap) - offsetZ]}
              onClick={(e) => { e.stopPropagation(); onToggleHueco(key); }}
            >
              {renderMaterial('bloque', isHueco)}
            </Box>
          );
        }
      }
    }
  }

  return (
    <Canvas camera={{ position: [0, 6, 8], fov: 50 }}>
      <ambientLight intensity={0.6} />
      <directionalLight position={[10, 20, 10]} intensity={1.5} castShadow />
      <pointLight position={[-10, -10, -10]} intensity={0.5} />
      
      {cajas}
      
      <OrbitControls makeDefault maxPolarAngle={Math.PI / 2 - 0.1} />
      <Grid position={[0, 0, 0]} args={[40, 40]} cellColor="#475569" sectionColor="#1e293b" fadeDistance={20} />
    </Canvas>
  );
};

export default Estiba3D;