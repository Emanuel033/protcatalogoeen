import React from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Box, Grid, Cylinder } from '@react-three/drei';

const Estiba3D = ({ frente, fondo, niveles, pzCama, tarimas, piezasVisuales }) => {
  const cajas = [];
  const boxSize = 1; // Tamaño base en el mundo 3D
  const gap = 0.05;  // Espaciado entre envases

  const n = Math.max(1, parseInt(niveles) || 1);
  const t = Math.max(1, parseInt(tarimas) || 1);

  // ==========================================
  // ESCENARIO 1: DEL LIENZO 2D AL MUNDO 3D
  // ==========================================
  if (piezasVisuales && piezasVisuales.length > 0) {
    // Factor de conversión: ~30 píxeles de tu pantalla = 1 unidad 3D
    const scale = 30; 
    const offsetX = 150 / scale; // Centro aproximado del lienzo
    const offsetZ = 60 / scale;

    for (let tarima = 0; tarima < t; tarima++) {
      for (let y = 0; y < n; y++) {
        piezasVisuales.forEach((p, index) => {
          // Convertimos pixeles a coordenadas X y Z
          const x3D = (p.x / scale) - offsetX;
          const z3D = (p.y / scale) - offsetZ + (tarima * 4); // 4 unidades de separación entre tarimas
          
          const key = `lienzo-${tarima}-${y}-${index}`;
          const posY = y * (boxSize + gap) + 0.5;

          // Si dibujaste un círculo en el lienzo, renderizamos un Cilindro naranja
          if (p.forma === 'circulo') {
            cajas.push(
              <Cylinder key={key} position={[x3D, posY, z3D]} args={[0.5, 0.5, 1, 32]}>
                <meshStandardMaterial color="#f59e0b" roughness={0.3} metalness={0.2} />
              </Cylinder>
            );
          } else {
            // Si es cuadrado/rectángulo, renderizamos Cajas azules
            const isRectH = p.forma === 'rectangulo-h';
            const isRectV = p.forma === 'rectangulo-v';
            cajas.push(
              <Box key={key} position={[x3D, posY, z3D]} args={[isRectH ? 2 : 1, 1, isRectV ? 2 : 1]}>
                <meshStandardMaterial color="#3b82f6" roughness={0.2} metalness={0.1} />
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
  else if (parseInt(pzCama) > 0) {
    const pz = parseInt(pzCama);
    // Calculamos una cuadrícula aproximada para que se vea ordenado
    const cols = Math.ceil(Math.sqrt(pz));
    const offsetX = (cols * (boxSize + gap)) / 2 - (boxSize / 2);

    for (let tarima = 0; tarima < t; tarima++) {
      for (let y = 0; y < n; y++) {
        for (let i = 0; i < pz; i++) {
          const col = i % cols;
          const row = Math.floor(i / cols);
          const offsetZ = (Math.ceil(pz/cols) * (boxSize + gap)) / 2 - (boxSize / 2);
          
          cajas.push(
            <Box key={`cama-${tarima}-${y}-${i}`} position={[col * (boxSize + gap) - offsetX, y * (boxSize+gap) + 0.5, row * (boxSize + gap) - offsetZ + (tarima * 4)]}>
              {/* Color morado para diferenciar las Camas */}
              <meshStandardMaterial color="#8b5cf6" roughness={0.2} metalness={0.1} />
            </Box>
          );
        }
      }
    }
  } 
  // ==========================================
  // ESCENARIO 3: BLOQUE BÁSICO (Por defecto)
  // ==========================================
  else {
    const f = Math.max(1, parseInt(frente) || 1);
    const d = Math.max(1, parseInt(fondo) || 1);
    const offsetX = (f * (boxSize + gap)) / 2 - (boxSize / 2);
    const offsetZ = (d * (boxSize + gap)) / 2 - (boxSize / 2);

    for (let y = 0; y < n; y++) {
      for (let x = 0; x < f; x++) {
        for (let z = 0; z < d; z++) {
          cajas.push(
            <Box key={`bloque-${x}-${y}-${z}`} position={[x * (boxSize + gap) - offsetX, y * (boxSize + gap) + 0.5, z * (boxSize + gap) - offsetZ]}>
              <meshStandardMaterial color="#10b981" roughness={0.2} metalness={0.1} />
            </Box>
          );
        }
      }
    }
  }

  return (
    <Canvas camera={{ position: [5, 5, 5], fov: 50 }}>
      {/* Luces de almacén */}
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 20, 10]} intensity={1.5} castShadow />
      <pointLight position={[-10, -10, -10]} intensity={0.5} />
      
      {cajas}
      
      {/* Controles táctiles/mouse */}
      <OrbitControls makeDefault />
      
      {/* Piso del almacén */}
      <Grid position={[0, 0, 0]} args={[40, 40]} cellColor="#475569" sectionColor="#1e293b" fadeDistance={20} />
    </Canvas>
  );
};

export default Estiba3D;