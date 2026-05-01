import React from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Box, Grid, Cylinder } from '@react-three/drei';

const Estiba3D = ({ modoOrigen, frente, fondo, niveles, pzCama, tarimas, piezasVisuales, huecos3D, onToggleHueco, estibaCruzada }) => {
  const cajas = [];
  const boxSize = 1;
  const gap = 0.05;

  const n = Math.max(1, parseInt(niveles) || 1);
  const t = Math.max(1, parseInt(tarimas) || 1);

  const renderMaterial = (forma, isHueco) => {
    if (isHueco) return <meshStandardMaterial color="#ef4444" transparent opacity={0.3} depthWrite={false} />;
    if (forma === 'circulo') return <meshStandardMaterial color="#f59e0b" roughness={0.3} metalness={0.2} />;
    if (forma === 'cama') return <meshStandardMaterial color="#8b5cf6" roughness={0.2} metalness={0.1} />;
    if (forma === 'bloque') return <meshStandardMaterial color="#10b981" roughness={0.2} metalness={0.1} />;
    return <meshStandardMaterial color="#3b82f6" roughness={0.2} metalness={0.1} />;
  };

  // ==========================================
  // ESCENARIO 1: LIENZO (CON ESTIBA CRUZADA)
  // ==========================================
  if (modoOrigen === 'visual' && piezasVisuales && piezasVisuales.length > 0) {
    const scale = 34; 
    const offsetX = 5; 
    const offsetZ = 2.5; 

    // Primero, encontramos el CENTRO del dibujo que hiciste para poder rotarlo sobre su propio eje
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    piezasVisuales.forEach(p => {
      const wPx = p.forma.includes('-h') ? (p.forma === 'rectangulo-h' ? 68 : 51) : 34;
      const dPx = p.forma.includes('-v') ? (p.forma === 'rectangulo-v' ? 68 : 51) : 34;
      const cx = p.x + (wPx / 2);
      const cy = p.y + (dPx / 2);
      const base3Dx = (cx / scale) - offsetX;
      const base3Dz = (cy / scale) - offsetZ;
      if (base3Dx < minX) minX = base3Dx;
      if (base3Dx > maxX) maxX = base3Dx;
      if (base3Dz < minZ) minZ = base3Dz;
      if (base3Dz > maxZ) maxZ = base3Dz;
    });

    const centroEstibaX = (minX + maxX) / 2;
    const centroEstibaZ = (minZ + maxZ) / 2;

    for (let tarima = 0; tarima < t; tarima++) {
      for (let y = 0; y < n; y++) {
        // ¿Es un nivel impar y activaste el checkbox? ¡Rotamos la capa entera!
        const debeRotar = estibaCruzada && (y % 2 !== 0);

        piezasVisuales.forEach((p, index) => {
          // Extraemos proporciones dinámicamente de tu CSS a medidas 3D
          const wPx = p.forma.includes('-h') ? (p.forma === 'rectangulo-h' ? 68 : 51) : 34;
          const dPx = p.forma.includes('-v') ? (p.forma === 'rectangulo-v' ? 68 : 51) : 34;
          
          const ancho3D = wPx / scale; // Ejem: 51/34 = 1.5 de ancho
          const fondo3D = dPx / scale; // Ejem: 68/34 = 2.0 de fondo
          
          const cx = p.x + (wPx / 2);
          const cy = p.y + (dPx / 2);

          let x3D = (cx / scale) - offsetX;
          let z3D = (cy / scale) - offsetZ;

          // Magia de rotación de 180° (invierte las coordenadas basado en el centro)
          if (debeRotar) {
            x3D = centroEstibaX - (x3D - centroEstibaX);
            z3D = centroEstibaZ - (z3D - centroEstibaZ);
          }

          // Agregamos el offset de la tarima (hacia atrás)
          z3D += (tarima * 3); 
          const posY = y * (boxSize + gap) + 0.5;
          const key = `lienzo-${tarima}-${y}-${index}`;
          const isHueco = huecos3D.includes(key);

          const props = { key: key, position: [x3D, posY, z3D], onClick: (e) => { e.stopPropagation(); onToggleHueco(key); } };

          if (p.forma === 'circulo') {
            cajas.push(<Cylinder {...props} args={[0.5, 0.5, 1, 32]}>{renderMaterial('circulo', isHueco)}</Cylinder>);
          } else {
            cajas.push(<Box {...props} args={[ancho3D, 1, fondo3D]}>{renderMaterial('caja', isHueco)}</Box>);
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
            <Box key={key} position={[col * (boxSize + gap) - offsetX, y * (boxSize+gap) + 0.5, row * (boxSize + gap) - offsetZ + (tarima * 4)]} onClick={(e) => { e.stopPropagation(); onToggleHueco(key); }}>
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
      // Rotar bloque entero para alternar
      const debeRotar = estibaCruzada && (y % 2 !== 0);
      const iterF = debeRotar ? d : f;
      const iterD = debeRotar ? f : d;
      
      const offX = (iterF * (boxSize + gap)) / 2 - (boxSize / 2);
      const offZ = (iterD * (boxSize + gap)) / 2 - (boxSize / 2);

      for (let x = 0; x < iterF; x++) {
        for (let z = 0; z < iterD; z++) {
          const key = `bloque-${x}-${y}-${z}`;
          const isHueco = huecos3D.includes(key);

          cajas.push(
            <Box key={key} position={[x * (boxSize + gap) - offX, y * (boxSize + gap) + 0.5, z * (boxSize + gap) - offZ]} onClick={(e) => { e.stopPropagation(); onToggleHueco(key); }}>
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