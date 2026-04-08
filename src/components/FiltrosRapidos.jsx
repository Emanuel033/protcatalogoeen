import React, { useMemo } from 'react';
import { useApp } from '../context/AppContext';

// 🧠 FUNCIONES AUXILIARES PARA DETECTAR CAPACIDADES INTELIGENTEMENTE
// Esto evita que "1 L" se confunda con "10 L" o "120 L"
const vL = (num) => new RegExp(`\\b${num}\\s*(l|lt|lts|litro|litros)\\b`, 'i');
const vML = (num) => new RegExp(`\\b${num}\\s*(ml|m\\.l\\.|mililitros)\\b`, 'i');
const vG = (num) => new RegExp(`\\b${num}\\s*(g|gr|grs|gramo|gramos)\\b`, 'i');
const vKG = (num) => new RegExp(`\\b${num}\\s*(k|kg|kgs|kilo|kilos)\\b`, 'i');

// 📕 DICCIONARIO MAESTRO DE REGLAS (Puedes agregar las que quieras aquí)
// Nota: Exportamos esto para que el ProductGrid también lo pueda usar
export const REGLAS_FILTROS = [
  // --- CAPACIDADES (LITROS) ---
  { id: '1000_l', label: '1000 L', test: (n) => vL('1000').test(n) },
  { id: '200_l', label: '200 L', test: (n) => vL('200').test(n) },
  { id: '120_l', label: '120 L', test: (n) => vL('120').test(n) },
  { id: '50_l', label: '50 L', test: (n) => vL('50').test(n) },
  { id: '25_l', label: '25 L', test: (n) => vL('25').test(n) },
  { id: '20_l', label: '20 L', test: (n) => vL('20').test(n) },
  { id: '19_l', label: '19 L', test: (n) => vL('19').test(n) },
  { id: '15_l', label: '15 L', test: (n) => vL('15').test(n) },
  { id: '10_l', label: '10 L', test: (n) => vL('10').test(n) },
  { id: '9_l', label: '9 L', test: (n) => vL('9').test(n) },
  { id: '8_l', label: '8 L', test: (n) => vL('8').test(n) },
  { id: '6_l', label: '6 L', test: (n) => vL('6').test(n) },
  { id: '5_l', label: '5 L', test: (n) => vL('5').test(n) },
  { id: '4_l', label: '4 L', test: (n) => vL('4').test(n) },
  { id: '2_l', label: '2 L', test: (n) => vL('2').test(n) },
  { id: '1_l', label: '1 Litro', test: (n) => vL('1').test(n) || vML('1000').test(n) },
  
  // --- CAPACIDADES (ML) ---
  { id: '750_ml', label: '750 ml', test: (n) => vML('750').test(n) },
  { id: '500_ml', label: '500 ml', test: (n) => vML('500').test(n) || vL('0\\.5|1/2').test(n) },
  { id: '355_ml', label: '355 ml', test: (n) => vML('355').test(n) },
  { id: '250_ml', label: '250 ml', test: (n) => vML('250').test(n) },
  { id: '240_ml', label: '240 ml', test: (n) => vML('240').test(n) },
  { id: '125_ml', label: '125 ml', test: (n) => vML('125').test(n) },
  { id: '120_ml', label: '120 ml', test: (n) => vML('120').test(n) },
  { id: '100_ml', label: '100 ml', test: (n) => vML('100').test(n) },
  { id: '60_ml', label: '60 ml', test: (n) => vML('60').test(n) },
  { id: '30_ml', label: '30 ml', test: (n) => vML('30').test(n) },
  { id: '10_ml', label: '10 ml', test: (n) => vML('10').test(n) },

  // --- CAPACIDADES (PESO) ---
  { id: '4_kg', label: '4 Kg', test: (n) => vKG('4').test(n) },
  { id: '2_kg', label: '2 Kg', test: (n) => vKG('2').test(n) },
  { id: '1_5_kg', label: '1.5 Kg', test: (n) => vKG('1\\.5').test(n) },
  { id: '1_kg', label: '1 Kg', test: (n) => vKG('1').test(n) || vG('1000').test(n) },
  { id: '500_g', label: '500 g', test: (n) => vG('500').test(n) },
  { id: '250_g', label: '250 g', test: (n) => vG('250').test(n) },
  { id: '240_g', label: '240 g', test: (n) => vG('240').test(n) },
  { id: '125_g', label: '125 g', test: (n) => vG('125').test(n) },
  { id: '120_g', label: '120 g', test: (n) => vG('120').test(n) },
  { id: '60_g', label: '60 g', test: (n) => vG('60').test(n) },
  { id: '50_g', label: '50 g', test: (n) => vG('50').test(n) },
  { id: '40_g', label: '40 g', test: (n) => vG('40').test(n) },
  { id: '30_g', label: '30 g', test: (n) => vG('30').test(n) },
  { id: '20_g', label: '20 g', test: (n) => vG('20').test(n) },
  { id: '10_g', label: '10 g', test: (n) => vG('10').test(n) },

  // --- FAMILIAS ESPECIALIZADAS ---
  { id: 'boston_pad', label: 'Boston PAD', test: (n) => n.includes('boston') && /\b(pad|pead)\b/.test(n) },
  { id: 'boston_pet', label: 'Boston PET', test: (n) => n.includes('boston') && /\bpet\b/.test(n) },
  { id: 'botella_oval', label: 'Botellas Ovales', test: (n) => n.includes('botella pet oval') },
  { id: 'alcoholera', label: 'Alcoholeras', test: (n) => n.includes('alcoholera') },
  { id: 'lechero', label: 'Lecheros', test: (n) => n.includes('lechero') },
  { id: 'cubeta', label: 'Cubetas', test: (n) => n.includes('cubeta') },
  { id: 'stolz', label: 'Stolz', test: (n) => n.includes('stolz') },
  { id: 'pizeta', label: 'Pizetas', test: (n) => /\b(pizeta|piseta)s?\b/.test(n) },
  { id: 'pegamento', label: 'Pegamentos', test: (n) => n.includes('pegamento') },
  { id: 'cuadrada', label: 'Cuadradas', test: (n) => n.includes('cuadrada') || n.includes('cuadrado') },
  { id: 'cilindrico', label: 'Cilíndricos', test: (n) => n.includes('cilindric') },
  { id: 'campana', label: 'Campanas', test: (n) => n.includes('campana') },
  { id: 'flex', label: 'Flexibles', test: (n) => n.includes('flex') },
  { id: 'porron', label: 'Porrones', test: (n) => n.includes('porron') || n.includes('porrón') },
  { id: 'tambo', label: 'Tambos', test: (n) => n.includes('tambo') },
  { id: 'garrafa_pad', label: 'Garrafas PAD', test: (n) => n.includes('garrafa') && /\b(pad|pead)\b/.test(n) },
  { id: 'garrafa_pet', label: 'Garrafas PET', test: (n) => n.includes('garrafa') && /\bpet\b/.test(n) },
  { id: 'garrafon', label: 'Garrafones', test: (n) => n.includes('garrafon') || n.includes('garrafón') },
  { id: 'galon_ind', label: 'Galón Ind.', test: (n) => n.includes('galon industrial') || n.includes('galón industrial') },
  { id: 'vitrolero', label: 'Vitroleros', test: (n) => n.includes('vitrolero') },
  { id: 'tarro', label: 'Tarros', test: (n) => n.includes('tarro') },
  { id: 'farmaceutica', label: 'Farmacéuticas', test: (n) => n.includes('farmaceutica') || n.includes('farmacéutica') },
  { id: 'especiero', label: 'Especieros', test: (n) => n.includes('especiero') },
  { id: 'bolsa', label: 'Bolsas', test: (n) => n.includes('bolsa') },
  { id: 'cajita', label: 'Cajitas', test: (n) => n.includes('cajita') },
  { id: 'pomadera', label: 'Pomaderas', test: (n) => n.includes('pomadera') },
  
  // --- ACCESORIOS ---
  { id: 'atomizador', label: 'Atomizadores', test: (n) => n.includes('atomizador') },
  { id: 'misil', label: 'Misiles', test: (n) => n.includes('misil') },
  { id: 'tapa_facil', label: 'Tapa Fácil', test: (n) => n.includes('tapa facil') || n.includes('tapa fácil') },
  { id: 'ttp', label: 'Triple Presión', test: (n) => n.includes('ttp') || n.includes('triple presion') },
  { id: 'c_fenol', label: 'Con Fenol', test: (n) => /\bc\/fenol\b/.test(n) || n.includes('con fenol') },
  { id: 's_fenol', label: 'Sin Fenol', test: (n) => /\bs\/fenol\b/.test(n) || n.includes('sin fenol') },
  { id: 'gotero', label: 'Goteros', test: (n) => n.includes('gotero') && !n.includes('alcuzar') },
  { id: 'gotero_alcuzar', label: 'Alcuzar', test: (n) => n.includes('alcuzar') },
  { id: 'bomba_dosif', label: 'Dosificadoras', test: (n) => n.includes('bomba dosificadora') || n.includes('dosificadora') },
  { id: 'liner', label: 'Liners', test: (n) => n.includes('liner') },
  { id: 'espumadora', label: 'Espumadoras', test: (n) => n.includes('espumadora') },

  // --- FORMAS / USOS ---
  { id: 'grasero', label: 'Graseros', test: (n) => n.includes('grasero') },
  { id: 'tintero', label: 'Tinteros', test: (n) => n.includes('tintero') },
  { id: 'anticongelante', label: 'Anticongelante', test: (n) => n.includes('anticongelante') },
  { id: 'mostacero', label: 'Mostaceros', test: (n) => n.includes('mostacero') },
  { id: 'squeezable', label: 'Squeezables', test: (n) => n.includes('squeezable') },
  { id: 'whiskero', label: 'Whiskeros', test: (n) => n.includes('whiskera') },
  { id: 'conico', label: 'Cónicos', test: (n) => n.includes('conico') || n.includes('cónico') },
  { id: 'salsero', label: 'Salseros', test: (n) => n.includes('salsera') },
  { id: 'quimica', label: 'Químicas', test: (n) => n.includes('quimica') || n.includes('química') },
  { id: 'ambar', label: 'Ámbar', test: (n) => n.includes('ambar') || n.includes('ámbar') },
  { id: 'pastilleros', label: 'Pastilleros', test: (n) => n.includes('pastillero') || n.includes('pastiller') },
];

function FiltrosRapidos({ productosMostrados }) {
  const { filtroRapido, setFiltroRapido } = useApp();

  const filtrosDisponibles = useMemo(() => {
    const encontrados = new Set();
    productosMostrados.forEach(p => {
      const nombreNorm = (p.name || '').toLowerCase();
      REGLAS_FILTROS.forEach(regla => {
        if (regla.test(nombreNorm)) encontrados.add(regla.id);
      });
    });
    return REGLAS_FILTROS.filter(regla => encontrados.has(regla.id));
  }, [productosMostrados]);

  if (filtrosDisponibles.length === 0) return null;

  return (
    <div className="w-full bg-slate-50 pb-3 pt-2 mb-4 sticky top-0 z-10 shadow-[0_10px_10px_-10px_rgba(0,0,0,0.05)]">
      <div className="flex items-center gap-2 overflow-x-auto hide-scroll px-2 pb-1">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap shrink-0 flex items-center gap-1">
          <i className="fa-solid fa-tags"></i> Filtros:
        </span>
        
        <button
          onClick={() => setFiltroRapido(null)}
          className={`shrink-0 px-3 py-1.5 rounded-full text-[11px] font-bold transition-all border ${
            filtroRapido === null 
              ? 'bg-slate-800 text-white border-slate-800' 
              : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400'
          }`}
        >
          Todos
        </button>

        {filtrosDisponibles.map(filtro => {
          const isActive = filtroRapido === filtro.id;
          return (
            <button
              key={filtro.id}
              onClick={() => setFiltroRapido(isActive ? null : filtro.id)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-[11px] font-bold transition-all border ${
                isActive 
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-200/50' 
                  : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300 hover:text-indigo-600'
              }`}
            >
              {filtro.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default FiltrosRapidos;
