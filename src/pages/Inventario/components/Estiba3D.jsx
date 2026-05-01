import React from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Box, Grid } from '@react-three/drei';

const Estiba3D = ({ frente, fondo, niveles }) => {
  const f = Math.max(1, parseInt(frente) || 1);
  const d = Math.max(1, parseInt(fondo) || 1);
  const n = Math.max(1, parseInt(niveles) || 1);

  const cajas = [];
  const boxSize = 1; // Tamaño de cada envase/caja
  const gap = 0.05;  // Espaciado entre ellas

  // Calculamos el centro para que la cámara siempre lo enfoque bonito
  const offsetX = (f * (boxSize + gap)) / 2 - (boxSize / 2);
  const offsetZ = (d * (boxSize + gap)) / 2 - (boxSize / 2);

  for (let y = 0; y < n; y++) {
    for (let x = 0; x < f; x++) {
      for (let z = 0; z < d; z++) {
        cajas.push(
          <Box 
            key={`${x}-${y}-${z}`} 
            position={[
              x * (boxSize + gap) - offsetX, 
              y * (boxSize + gap) + (boxSize / 2), 
              z * (boxSize + gap) - offsetZ
            ]}
            args={[boxSize, boxSize, boxSize]}
          >
            {/* Color azul estilo EEN, con los bordes iluminados */}
            <meshStandardMaterial color="#3b82f6" roughness={0.2} metalness={0.1} />
          </Box>
        );
      }
    }
  }

  return (
    <Canvas camera={{ position: [5, 5, 5], fov: 50 }}>
      <ambientLight intensity={0.6} />
      <directionalLight position={[10, 10, 10]} intensity={1} />
      <pointLight position={[-10, -10, -10]} intensity={0.5} />
      
      {/* Aquí inyectamos todas las cajitas generadas */}
      {cajas}
      
      {/* Controles para girar con el dedo o el mouse */}
      <OrbitControls makeDefault />
      
      {/* Piso virtual */}
      <Grid position={[0, 0, 0]} args={[20, 20]} cellColor="#64748b" sectionColor="#334155" />
    </Canvas>
  );
};

export default Estiba3D;