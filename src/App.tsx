import { useState, useEffect } from 'react';
import { 
  Atom, Beaker, Calculator, BookOpen, Play, ThermometerSun, 
  ArrowRightLeft, FlaskConical, TrendingUp 
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

interface AtomCount {
  [key: string]: number;
}

interface Reaction {
  name: string;
  equation: string;
  reactants: string[];
  products: string[];
  coefficients: number[];
  K: number;
  description: string;
}

const predefinedReactions: Reaction[] = [
  {
    name: "Ammonia Synthesis (Haber-Bosch)",
    equation: "N₂ + 3H₂ ⇌ 2NH₃",
    reactants: ["N2", "H2"],
    products: ["NH3"],
    coefficients: [1, 3, 2],
    K: 0.0005,
    description: "Industrial production of ammonia. Exothermic reaction."
  },
  {
    name: "Sulfur Trioxide Formation",
    equation: "2SO₂ + O₂ ⇌ 2SO₃",
    reactants: ["SO2", "O2"],
    products: ["SO3"],
    coefficients: [2, 1, 2],
    K: 4.5,
    description: "Key step in sulfuric acid production."
  },
  {
    name: "Hydrogen Iodide Equilibrium",
    equation: "H₂ + I₂ ⇌ 2HI",
    reactants: ["H2", "I2"],
    products: ["HI"],
    coefficients: [1, 1, 2],
    K: 50,
    description: "Classic gas phase equilibrium."
  },
  {
    name: "Acetic Acid Dissociation",
    equation: "CH₃COOH ⇌ CH₃COO⁻ + H⁺",
    reactants: ["CH3COOH"],
    products: ["CH3COO", "H"],
    coefficients: [1, 1, 1],
    K: 1.8e-5,
    description: "Weak acid ionization in water."
  }
];

function parseFormula(formula: string): AtomCount {
  const counts: AtomCount = {};
  const regex = /([A-Z][a-z]?)(\d*)/g;
  let match;
  
  while ((match = regex.exec(formula)) !== null) {
    const atom = match[1];
    const num = parseInt(match[2]) || 1;
    counts[atom] = (counts[atom] || 0) + num;
  }
  return counts;
}

function countAtomsInSide(side: string, coeff: number = 1): AtomCount {
  // For simplicity, split by + and parse each
  const compounds = side.split('+').map(s => s.trim());
  const total: AtomCount = {};
  
  compounds.forEach(compound => {
    const atoms = parseFormula(compound);
    Object.keys(atoms).forEach(atom => {
      total[atom] = (total[atom] || 0) + atoms[atom] * coeff;
    });
  });
  
  return total;
}

function isBalanced(leftSide: string, leftCoeffs: number[], rightSide: string, rightCoeffs: number[]): boolean {
  try {
    // Apply coefficients
    const leftTotal: AtomCount = {};
    const compoundsL = leftSide.split('+').map(s => s.trim());
    compoundsL.forEach((comp, i) => {
      const atoms = parseFormula(comp);
      const coeff = leftCoeffs[i] || 1;
      Object.keys(atoms).forEach(atom => {
        leftTotal[atom] = (leftTotal[atom] || 0) + atoms[atom] * coeff;
      });
    });
    
    const rightTotal: AtomCount = {};
    const compoundsR = rightSide.split('+').map(s => s.trim());
    compoundsR.forEach((comp, i) => {
      const atoms = parseFormula(comp);
      const coeff = rightCoeffs[i] || 1;
      Object.keys(atoms).forEach(atom => {
        rightTotal[atom] = (rightTotal[atom] || 0) + atoms[atom] * coeff;
      });
    });
    
    const allAtoms = new Set([...Object.keys(leftTotal), ...Object.keys(rightTotal)]);
    for (const atom of allAtoms) {
      if (Math.abs((leftTotal[atom] || 0) - (rightTotal[atom] || 0)) > 0.01) {
        return false;
      }
    }
    return true;
  } catch (e) {
    return false;
  }
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'home' | 'balancer' | 'calculator' | 'simulator' | 'learn'>('home');
  const [balancerLeft, setBalancerLeft] = useState('H2 + O2');
  const [balancerRight, setBalancerRight] = useState('H2O');
  const [leftCoeffs, setLeftCoeffs] = useState([2, 1]);
  const [rightCoeffs, setRightCoeffs] = useState([2]);
  const [isBalancedState, setIsBalancedState] = useState(false);
  
  // Calculator states
  const [selectedReaction, setSelectedReaction] = useState(0);
  const [Kc, setKc] = useState(0.0005);
  const [initialConc, setInitialConc] = useState({
    A: 1.0, B: 1.0, C: 0, D: 0
  });
  const [equilibriumConc, setEquilibriumConc] = useState<any>(null);
  const [timeData, setTimeData] = useState<any[]>([]);
  
  // Simulator states
  const [simConc, setSimConc] = useState({
    N2: 2.0,
    H2: 6.0,
    NH3: 0.5
  });
  const [temperature, setTemperature] = useState(450);
  const [volume, setVolume] = useState(10);
  const [shiftDirection, setShiftDirection] = useState<'left' | 'right' | 'none'>('none');
  const [simData, setSimData] = useState<any[]>([]);
  
  const currentReaction = predefinedReactions[selectedReaction];

  // Check balance on changes
  useEffect(() => {
    const leftSide = balancerLeft;
    const rightSide = balancerRight;
    const balanced = isBalanced(leftSide, leftCoeffs, rightSide, rightCoeffs);
    setIsBalancedState(balanced);
  }, [balancerLeft, balancerRight, leftCoeffs, rightCoeffs]);

  // Simulate equilibrium approach for calculator
  const calculateEquilibrium = () => {
    const rxn = predefinedReactions[selectedReaction];
    let k = Kc || rxn.K;
    
    // Simple quadratic solver for 1 reactant dissociation or 2 reactant 1:1
    let eqConc: any = {};
    let simTimes: any[] = [];
    
    if (rxn.name.includes("Acetic")) {
      // Weak acid: HA ⇌ H+ + A- , x^2 = K*(C0 - x)
      const C0 = initialConc.A || 0.1;
      const ka = k;
      let x = 0;
      
      // Quadratic: x² + ka x - ka C0 = 0
      const a = 1, b = ka, c = -ka * C0;
      x = (-b + Math.sqrt(b*b - 4*a*c)) / (2*a);
      
      eqConc = {
        CH3COOH: C0 - x,
        CH3COO: x,
        H: x
      };
      
      // Generate time series
      for (let t = 0; t <= 20; t++) {
        const progress = 1 - Math.exp(-0.4 * t);
        simTimes.push({
          time: t,
          [rxn.reactants[0]]: C0 - x * progress,
          H: x * progress,
          CH3COO: x * progress
        });
      }
    } else {
      // Generic simple for A + B ⇌ C + D or similar
      // For demo, use approximation for Haber like
      const initN2 = initialConc.A || 1;
      const initH2 = initialConc.B || 3;
      const initNH3 = initialConc.C || 0;
      
      // Simple extent of reaction x for N2 + 3H2 = 2NH3
      let x = 0.3; // demo value
      if (k < 0.01) x = 0.15; // low K less product
      
      eqConc = {
        N2: Math.max(0.05, initN2 - x),
        H2: Math.max(0.1, initH2 - 3 * x),
        NH3: initNH3 + 2 * x
      };
      
      // Time series approach to equilibrium
      for (let t = 0; t <= 25; t += 1) {
        const progress = Math.min(1, t / 12);
        simTimes.push({
          time: t,
          N2: initN2 - x * progress,
          H2: initH2 - 3 * x * progress,
          NH3: initNH3 + 2 * x * progress
        });
      }
    }
    
    setEquilibriumConc(eqConc);
    setTimeData(simTimes);
  };

  const runLeChatelier = () => {
    let newShift: 'left' | 'right' | 'none' = 'none';
    
    // Simple heuristic based on conditions
    if (temperature > 500) {
      newShift = 'left'; // exothermic, higher T favors reactants
    } else if (volume < 5) {
      newShift = 'right'; // decrease volume favors fewer moles (right side)
    } else if (simConc.NH3 > 3) {
      newShift = 'left';
    } else if (simConc.N2 < 1) {
      newShift = 'right';
    }
    
    setShiftDirection(newShift);
    
    // Generate simulation data
    const newData = [];
    for (let i = 0; i < 15; i++) {
      const t = i * 2;
      let n2 = simConc.N2;
      let h2 = simConc.H2;
      let nh3 = simConc.NH3;
      
      if (newShift === 'right') {
        n2 = Math.max(0.2, n2 - 0.3 * (i / 10));
        h2 = Math.max(0.5, h2 - 0.9 * (i / 10));
        nh3 = nh3 + 0.6 * (i / 5);
      } else if (newShift === 'left') {
        n2 = n2 + 0.2 * (i / 8);
        h2 = h2 + 0.6 * (i / 8);
        nh3 = Math.max(0.3, nh3 - 0.4 * (i / 5));
      }
      
      newData.push({
        time: t,
        N2: parseFloat(n2.toFixed(2)),
        H2: parseFloat(h2.toFixed(2)),
        NH3: parseFloat(nh3.toFixed(2))
      });
    }
    setSimData(newData);
  };

  const updateLeftCoeff = (index: number, value: number) => {
    const newCoeffs = [...leftCoeffs];
    newCoeffs[index] = Math.max(1, value);
    setLeftCoeffs(newCoeffs);
  };

  const updateRightCoeff = (index: number, value: number) => {
    const newCoeffs = [...rightCoeffs];
    newCoeffs[index] = Math.max(1, value);
    setRightCoeffs(newCoeffs);
  };

  const loadExample = (example: string) => {
    if (example === 'water') {
      setBalancerLeft('H2 + O2');
      setBalancerRight('H2O');
      setLeftCoeffs([2, 1]);
      setRightCoeffs([2]);
    } else if (example === 'ammonia') {
      setBalancerLeft('N2 + H2');
      setBalancerRight('NH3');
      setLeftCoeffs([1, 3]);
      setRightCoeffs([2]);
    } else if (example === 'combustion') {
      setBalancerLeft('C3H8 + O2');
      setBalancerRight('CO2 + H2O');
      setLeftCoeffs([1, 5]);
      setRightCoeffs([3, 4]);
    }
  };

  const resetCalculator = () => {
    setEquilibriumConc(null);
    setTimeData([]);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Navbar */}
      <nav className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-lg fixed w-full z-50">
        <div className="max-w-7xl mx-auto px-8 py-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center shadow-xl shadow-teal-500/30">
                <Atom className="h-6 w-6 text-zinc-950" />
              </div>
              <div>
                <div className="font-bold text-3xl tracking-tighter bg-gradient-to-r from-teal-300 to-cyan-400 bg-clip-text text-transparent">EQUICHEM</div>
                <div className="text-[10px] text-zinc-500 -mt-1">CÂN BẰNG HÓA HỌC</div>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2 bg-zinc-900 rounded-3xl p-1 border border-zinc-800">
            {[
              { id: 'home', label: 'Trang chủ', icon: TrendingUp },
              { id: 'balancer', label: 'Cân bằng', icon: Atom },
              { id: 'calculator', label: 'Tính toán', icon: Calculator },
              { id: 'simulator', label: 'Mô phỏng', icon: Play },
              { id: 'learn', label: 'Học tập', icon: BookOpen }
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-6 py-2.5 rounded-3xl flex items-center gap-2 text-sm font-medium transition-all ${
                    activeTab === tab.id 
                      ? 'bg-white text-zinc-900 shadow-lg shadow-teal-500/20' 
                      : 'hover:bg-zinc-800 text-zinc-400 hover:text-white'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
          
          <div className="flex items-center gap-4 text-sm">
            <div className="px-4 py-1.5 bg-zinc-900 rounded-2xl border border-teal-900 text-teal-400 flex items-center gap-2">
              <FlaskConical className="h-4 w-4" />
              <span className="font-mono">v1.8</span>
            </div>
          </div>
        </div>
      </nav>

      <div className="pt-24 pb-12 max-w-7xl mx-auto px-8">
        {/* HOME */}
        {activeTab === 'home' && (
          <div className="space-y-16">
            {/* Hero */}
            <div className="flex flex-col items-center text-center pt-8">
              <div className="inline-flex items-center gap-2 px-6 py-2 rounded-3xl bg-zinc-900 border border-teal-900 mb-6">
                <div className="w-2 h-2 bg-teal-400 rounded-full animate-pulse"></div>
                <span className="uppercase tracking-[3px] text-xs font-mono text-teal-400">Hóa Học Đang Hoạt Động</span>
              </div>
              
              <h1 className="text-7xl font-bold tracking-tighter mb-6 bg-gradient-to-b from-white to-zinc-400 bg-clip-text text-transparent">
                CÂN BẰNG<br />HÓA HỌC
              </h1>
              <p className="max-w-md text-xl text-zinc-400 mb-12">
                Khám phá, mô phỏng và tính toán cân bằng hóa học với giao diện tương tác hiện đại
              </p>
              
              <div className="flex gap-4">
                <button 
                  onClick={() => setActiveTab('simulator')}
                  className="px-10 py-4 bg-white hover:bg-teal-100 transition-colors text-zinc-900 rounded-2xl font-semibold flex items-center gap-3 group"
                >
                  BẮT ĐẦU MÔ PHỎNG
                  <Play className="group-active:rotate-12 transition" />
                </button>
                <button 
                  onClick={() => setActiveTab('calculator')}
                  className="px-8 py-4 border border-white/30 hover:bg-white/5 rounded-2xl font-medium flex items-center gap-2 transition-all active:scale-[0.985]"
                >
                  MỞ MÁY TÍNH
                </button>
              </div>
              
              <div className="mt-20 grid grid-cols-3 gap-8 w-full max-w-2xl">
                {[
                  { value: "Kc", label: "Hằng số cân bằng" },
                  { value: "Le Chatelier", label: "Nguyên tắc Le Chatelier" },
                  { value: "ICE Table", label: "Bảng ICE" }
                ].map((item, index) => (
                  <div key={index} className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-6 text-center hover:border-teal-500/50 transition-colors">
                    <div className="text-teal-400 font-mono text-4xl mb-1">{item.value}</div>
                    <div className="text-zinc-400 text-sm">{item.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Featured Reactions */}
            <div>
              <div className="flex items-end justify-between mb-8">
                <div>
                  <div className="uppercase text-teal-400 text-xs tracking-widest font-mono">PHẢN ỨNG NỔI BẬT</div>
                  <h2 className="text-4xl font-semibold">Các Hệ Cân Bằng Quan Trọng</h2>
                </div>
                <button onClick={() => setActiveTab('calculator')} className="text-teal-400 flex items-center gap-2 text-sm hover:text-teal-300">
                  XEM TẤT CẢ <ArrowRightLeft className="h-4 w-4" />
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {predefinedReactions.map((rxn, index) => (
                  <div 
                    key={index}
                    onClick={() => {
                      setSelectedReaction(index);
                      setActiveTab('calculator');
                    }}
                    className="group bg-zinc-900 border border-zinc-800 hover:border-teal-500 rounded-3xl p-8 cursor-pointer transition-all hover:-translate-y-1"
                  >
                    <div className="flex justify-between items-start mb-6">
                      <div className="text-5xl">🧪</div>
                      <div className={`text-xs font-mono px-4 py-1 rounded-full ${index === 0 ? 'bg-amber-400/10 text-amber-400' : 'bg-teal-400/10 text-teal-400'}`}>
                        {rxn.K < 1 ? 'K<small>c</small> &lt; 1' : 'K<small>c</small> &gt; 1'}
                      </div>
                    </div>
                    
                    <div className="font-mono text-xl mb-3 text-white/90 tracking-tight leading-none">{rxn.equation}</div>
                    <div className="text-zinc-400 text-sm line-clamp-2 mb-6">{rxn.description}</div>
                    
                    <div className="text-[10px] uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                      <div className="h-px flex-1 bg-zinc-700"></div>
                      NHẤN ĐỂ TÍNH TOÁN
                      <div className="h-px flex-1 bg-zinc-700"></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* BALANCER TAB */}
        {activeTab === 'balancer' && (
          <div className="max-w-4xl mx-auto">
            <div className="mb-12">
              <div className="flex items-center gap-4 mb-3">
                <div className="h-8 w-8 bg-teal-500/10 rounded-2xl flex items-center justify-center">
                  <Atom className="h-5 w-5 text-teal-400" />
                </div>
                <h2 className="text-5xl font-semibold tracking-tighter">Cân Bằng Phương Trình</h2>
              </div>
              <p className="text-zinc-400 max-w-md">Nhập công thức, điều chỉnh hệ số và kiểm tra xem phản ứng có cân bằng hay không.</p>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-10">
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-center">
                {/* Left side */}
                <div className="lg:col-span-2 space-y-6">
                  <div>
                    <div className="text-xs font-mono text-teal-400 mb-3 tracking-widest">PHẢN ỨNG (TRÁI)</div>
                    <input 
                      type="text" 
                      value={balancerLeft}
                      onChange={(e) => setBalancerLeft(e.target.value)}
                      className="w-full bg-black border border-zinc-700 focus:border-teal-400 rounded-2xl px-6 py-6 text-2xl font-light placeholder:text-zinc-600 outline-none"
                      placeholder="H2 + O2"
                    />
                    <div className="mt-4 flex gap-3">
                      {[1,2,3,4,5].map((num, i) => (
                        <button 
                          key={i}
                          onClick={() => updateLeftCoeff(i, num)}
                          className="flex-1 py-3 text-xs border border-zinc-700 hover:bg-zinc-800 rounded-2xl transition-colors"
                        >
                          ×{num}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-center">
                    <div className="text-6xl text-zinc-700">⇌</div>
                  </div>

                  <div>
                    <div className="text-xs font-mono text-teal-400 mb-3 tracking-widest">SẢN PHẨM (PHẢI)</div>
                    <input 
                      type="text" 
                      value={balancerRight}
                      onChange={(e) => setBalancerRight(e.target.value)}
                      className="w-full bg-black border border-zinc-700 focus:border-teal-400 rounded-2xl px-6 py-6 text-2xl font-light placeholder:text-zinc-600 outline-none"
                      placeholder="H2O"
                    />
                    <div className="mt-4 flex gap-3">
                      {[1,2,3,4,5].map((num, i) => (
                        <button 
                          key={i}
                          onClick={() => updateRightCoeff(i, num)}
                          className="flex-1 py-3 text-xs border border-zinc-700 hover:bg-zinc-800 rounded-2xl transition-colors"
                        >
                          ×{num}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Status */}
                <div className="lg:col-span-1 flex flex-col items-center justify-center py-8 border-l border-r border-zinc-800">
                  <div className={`w-32 h-32 rounded-full flex items-center justify-center border-8 transition-all duration-700 ${isBalancedState ? 'border-emerald-400 bg-emerald-900/30' : 'border-rose-400 bg-rose-900/30'}`}>
                    {isBalancedState ? (
                      <div className="text-center">
                        <div className="text-6xl">✓</div>
                        <div className="text-emerald-400 text-sm mt-4 font-medium">CÂN BẰNG</div>
                      </div>
                    ) : (
                      <div className="text-center">
                        <div className="text-6xl">⚖️</div>
                        <div className="text-rose-400 text-sm mt-4 font-medium">KHÔNG CÂN BẰNG</div>
                      </div>
                    )}
                  </div>
                  
                  <div className="text-xs text-center text-zinc-500 mt-8 max-w-[160px]">
                    Hệ số được tự động áp dụng cho mỗi chất. Thử thay đổi hệ số để cân bằng.
                  </div>
                </div>

                {/* Atom table */}
                <div className="lg:col-span-2 bg-black rounded-3xl p-8 border border-zinc-800">
                  <div className="text-xs uppercase font-mono mb-6 text-zinc-400">BẢNG NGUYÊN TỐ</div>
                  
                  <div className="space-y-8">
                    <div>
                      <div className="text-emerald-400 text-xs mb-4">BÊN TRÁI (Phản ứng)</div>
                      {(() => {
                        const leftAtoms = countAtomsInSide(balancerLeft);
                        return Object.keys(leftAtoms).length > 0 ? (
                          <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
                            {Object.entries(leftAtoms).map(([atom, count]) => (
                              <div key={atom} className="flex justify-between">
                                <span className="font-mono text-zinc-400">{atom}</span>
                                <span className="tabular-nums font-medium">{count}</span>
                              </div>
                            ))}
                          </div>
                        ) : <div className="opacity-40 text-xs">Nhập công thức...</div>;
                      })()}
                    </div>
                    
                    <div className="h-px bg-zinc-800"></div>
                    
                    <div>
                      <div className="text-violet-400 text-xs mb-4">BÊN PHẢI (Sản phẩm)</div>
                      {(() => {
                        const rightAtoms = countAtomsInSide(balancerRight);
                        return Object.keys(rightAtoms).length > 0 ? (
                          <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
                            {Object.entries(rightAtoms).map(([atom, count]) => (
                              <div key={atom} className="flex justify-between">
                                <span className="font-mono text-zinc-400">{atom}</span>
                                <span className="tabular-nums font-medium">{count}</span>
                              </div>
                            ))}
                          </div>
                        ) : <div className="opacity-40 text-xs">Nhập công thức...</div>;
                      })()}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-10 flex justify-center gap-4">
                <button 
                  onClick={() => loadExample('water')}
                  className="px-8 py-3 text-sm border border-white/10 hover:bg-white/5 rounded-2xl transition-colors"
                >
                  Tải ví dụ H₂O
                </button>
                <button 
                  onClick={() => loadExample('ammonia')}
                  className="px-8 py-3 text-sm border border-white/10 hover:bg-white/5 rounded-2xl transition-colors"
                >
                  Tải NH₃
                </button>
                <button 
                  onClick={() => loadExample('combustion')}
                  className="px-8 py-3 text-sm border border-white/10 hover:bg-white/5 rounded-2xl transition-colors"
                >
                  Đốt cháy C₃H₈
                </button>
              </div>
            </div>

            <div className="mt-8 text-center text-xs text-zinc-500 max-w-md mx-auto">
              Lưu ý: Công cụ này sử dụng parser công thức hóa học đơn giản. Hỗ trợ các công thức cơ bản như H2SO4, Ca(OH)2, CH3COOH...
            </div>
          </div>
        )}

        {/* CALCULATOR TAB */}
        {activeTab === 'calculator' && (
          <div>
            <div className="flex justify-between items-end mb-10">
              <div>
                <h2 className="text-5xl font-semibold tracking-tighter">Máy Tính Cân Bằng</h2>
                <p className="text-zinc-400">Tính nồng độ cân bằng, vẽ đồ thị tiếp cận cân bằng</p>
              </div>
              <select 
                value={selectedReaction}
                onChange={(e) => {
                  setSelectedReaction(parseInt(e.target.value));
                  setEquilibriumConc(null);
                  setTimeData([]);
                }}
                className="bg-zinc-900 border border-zinc-700 text-white rounded-2xl px-5 py-4 text-sm focus:outline-none focus:border-teal-400"
              >
                {predefinedReactions.map((r, i) => (
                  <option key={i} value={i}>{r.name}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-12 gap-8">
              {/* Input Panel */}
              <div className="col-span-12 lg:col-span-5 bg-zinc-900 rounded-3xl p-10 border border-zinc-800">
                <div className="mb-8">
                  <div className="font-mono text-sm text-teal-400 mb-2">PHẢN ỨNG ĐÃ CHỌN</div>
                  <div className="text-4xl font-light tracking-[-1px] text-white mb-2">{currentReaction.equation}</div>
                  <div className="text-zinc-400 text-sm leading-snug">{currentReaction.description}</div>
                </div>

                <div className="space-y-8">
                  <div>
                    <label className="block text-xs font-mono tracking-widest text-zinc-400 mb-4">HẰNG SỐ CÂN BẰNG Kc</label>
                    <div className="flex items-center gap-4">
                      <input 
                        type="number" 
                        value={Kc} 
                        onChange={(e) => setKc(parseFloat(e.target.value) || 0)}
                        step="0.0001"
                        className="flex-1 bg-black border border-zinc-700 rounded-2xl px-6 py-5 text-4xl font-light focus:border-teal-400 outline-none"
                      />
                      <div className="text-xs text-zinc-500">tại 298K</div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-mono tracking-widest text-zinc-400 mb-4">NỒNG ĐỘ BAN ĐẦU (mol/L)</label>
                    
                    <div className="space-y-6">
                      {currentReaction.reactants.map((r, i) => (
                        <div key={i} className="flex items-center gap-4">
                          <div className="w-20 font-mono text-sm text-zinc-400 shrink-0">{r}</div>
                          <input 
                            type="range" 
                            min="0" 
                            max={currentReaction.name.includes("Acetic") ? "0.5" : "5"} 
                            step="0.05"
                            value={initialConc.A || 1}
                            onChange={(e) => setInitialConc({...initialConc, A: parseFloat(e.target.value)})}
                            className="flex-1 accent-teal-400"
                          />
                          <input 
                            type="number" 
                            value={initialConc.A || 1} 
                            onChange={(e) => setInitialConc({...initialConc, A: parseFloat(e.target.value)})}
                            className="w-20 bg-zinc-950 border border-zinc-700 text-center rounded-xl py-2 text-sm"
                          />
                        </div>
                      ))}
                      
                      {currentReaction.products.map((p, i) => (
                        <div key={i} className="flex items-center gap-4">
                          <div className="w-20 font-mono text-sm text-rose-400 shrink-0">{p}</div>
                          <input 
                            type="range" 
                            min="0" 
                            max="2" 
                            step="0.05"
                            value={initialConc.C || 0}
                            onChange={(e) => setInitialConc({...initialConc, C: parseFloat(e.target.value)})}
                            className="flex-1 accent-rose-400"
                          />
                          <input 
                            type="number" 
                            value={initialConc.C || 0} 
                            onChange={(e) => setInitialConc({...initialConc, C: parseFloat(e.target.value)})}
                            className="w-20 bg-zinc-950 border border-zinc-700 text-center rounded-xl py-2 text-sm"
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button 
                      onClick={calculateEquilibrium}
                      className="flex-1 py-6 bg-gradient-to-r from-teal-400 to-cyan-400 text-zinc-950 rounded-3xl font-semibold flex items-center justify-center gap-2 hover:brightness-110 active:scale-[0.985] transition-all"
                    >
                      <Calculator className="h-5 w-5" /> TÍNH TOÁN CÂN BẰNG
                    </button>
                    <button 
                      onClick={resetCalculator}
                      className="px-8 py-6 border border-zinc-700 hover:bg-zinc-800 rounded-3xl transition-colors"
                    >
                      RESET
                    </button>
                  </div>
                </div>
              </div>

              {/* Results */}
              <div className="col-span-12 lg:col-span-7">
                {equilibriumConc ? (
                  <div className="bg-zinc-900 border border-zinc-700 rounded-3xl overflow-hidden">
                    <div className="p-8 border-b border-zinc-800">
                      <div className="uppercase text-xs tracking-[1px] font-mono text-emerald-400 mb-2">KẾT QUẢ CÂN BẰNG</div>
                      <div className="grid grid-cols-3 gap-4">
                        {Object.keys(equilibriumConc).map((key) => (
                          <div key={key} className="bg-black/60 rounded-2xl p-6">
                            <div className="text-xs text-zinc-400 mb-1 font-mono">{key}</div>
                            <div className="text-5xl font-light tabular-nums text-white">
                              {equilibriumConc[key].toFixed(3)}
                            </div>
                            <div className="text-xs text-zinc-500">mol/L</div>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    {/* Graph */}
                    <div className="p-8">
                      <div className="flex items-center justify-between mb-6">
                        <div className="text-sm font-medium">TIẾN TRÌNH TIẾP CẬN CÂN BẰNG</div>
                        <div className="text-xs px-5 py-1 bg-zinc-800 rounded-3xl text-teal-300">Thời gian (giây)</div>
                      </div>
                      
                      <div className="h-80 -mx-2">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={timeData}>
                            <CartesianGrid strokeDasharray="2 2" stroke="#27272a" />
                            <XAxis dataKey="time" stroke="#3f3f46" />
                            <YAxis stroke="#3f3f46" />
                            <Tooltip 
                              contentStyle={{ 
                                backgroundColor: '#18181b', 
                                border: 'none', 
                                borderRadius: '12px',
                                color: '#a1a1aa'
                              }} 
                            />
                            {Object.keys(timeData[0] || {}).filter(k => k !== 'time').map((key, idx) => (
                              <Line 
                                key={key}
                                type="natural" 
                                dataKey={key} 
                                stroke={idx === 0 ? "#14b8a6" : idx === 1 ? "#a78bfa" : "#f43f5e"} 
                                strokeWidth={3} 
                                dot={false}
                              />
                            ))}
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="h-full bg-zinc-900/70 border border-dashed border-zinc-700 rounded-3xl flex flex-col items-center justify-center text-center p-16">
                    <div className="text-7xl mb-6 opacity-40">📈</div>
                    <div className="text-2xl text-zinc-400 mb-3">Chưa có kết quả</div>
                    <p className="max-w-xs text-zinc-500">Điều chỉnh các thông số bên trái và nhấn nút TÍNH TOÁN CÂN BẰNG để xem biểu đồ và nồng độ cân bằng.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* SIMULATOR TAB */}
        {activeTab === 'simulator' && (
          <div className="max-w-5xl mx-auto">
            <div className="mb-8">
              <h2 className="text-5xl font-semibold tracking-tighter mb-2">Mô Phỏng Le Chatelier</h2>
              <p className="text-zinc-400">Thay đổi điều kiện và quan sát phản ứng chuyển dịch cân bằng theo nguyên tắc Le Chatelier</p>
            </div>

            <div className="grid grid-cols-12 gap-8">
              {/* Vessel Visualization */}
              <div className="col-span-12 lg:col-span-7 bg-zinc-900 rounded-3xl p-8 border border-zinc-700 relative overflow-hidden">
                <div className="absolute top-8 right-8 flex items-center gap-2 bg-black/70 px-5 py-1 rounded-3xl text-xs z-20">
                  <div className={`w-3 h-3 rounded-full ${shiftDirection === 'right' ? 'bg-emerald-400 animate-pulse' : shiftDirection === 'left' ? 'bg-orange-400 animate-pulse' : 'bg-zinc-600'}`}></div>
                  <span>{shiftDirection === 'right' ? 'DỊCH PHẢI' : shiftDirection === 'left' ? 'DỊCH TRÁI' : 'CÂN BẰNG'}</span>
                </div>

                <div className="text-center mb-6">
                  <div className="inline text-xs uppercase font-mono px-6 py-2 border border-teal-900 bg-zinc-950 rounded-3xl">N₂(g) + 3H₂(g) ⇌ 2NH₃(g)</div>
                </div>

                {/* Animated Vessel */}
                <div className="relative h-80 mx-auto w-80 border-4 border-zinc-700 bg-gradient-to-b from-zinc-950 to-black rounded-[4rem] flex items-center justify-center overflow-hidden shadow-inner">
                  {/* Particles */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div 
                        key={i}
                        className="absolute w-5 h-5 rounded-full bg-sky-400/70 flex items-center justify-center text-[10px] transition-all duration-1000"
                        style={{
                          left: `${35 + Math.sin(i) * 22}%`,
                          top: `${30 + (i % 3) * 18}%`,
                          transform: `scale(${shiftDirection === 'right' ? 1.4 : 1})`,
                          background: i < 3 ? '#22d3ee' : (i < 5 ? '#a5f3fc' : '#67e8f9')
                        }}
                      >
                        {i < 2 ? 'N' : i < 4 ? 'H' : 'NH₃'}
                      </div>
                    ))}
                  </div>
                  
                  <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-xs font-mono text-center leading-none">
                    <div className="text-teal-300">THỂ TÍCH: {volume} L</div>
                    <div className="text-amber-300">NHIỆT ĐỘ: {temperature}°C</div>
                  </div>
                  
                  {/* Equilibrium bar */}
                  <div className="absolute bottom-12 left-12 right-12 h-2 bg-zinc-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-cyan-400 to-violet-400 transition-all duration-1000" 
                      style={{width: `${Math.min(92, 30 + simConc.NH3 * 12)}%`}}
                    ></div>
                  </div>
                </div>

                <div className="flex justify-center gap-8 mt-8 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-sky-400 rounded"></div>
                    <span>N₂ / H₂</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-fuchsia-400 rounded"></div>
                    <span>NH₃</span>
                  </div>
                </div>
              </div>

              {/* Controls */}
              <div className="col-span-12 lg:col-span-5 space-y-6">
                <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8">
                  <div className="flex justify-between text-xs font-mono mb-6 text-zinc-400">
                    <div>CÁC THÔNG SỐ</div>
                    <button onClick={runLeChatelier} className="text-teal-400 hover:text-white flex items-center gap-1.5">
                      <Play className="h-3 w-3" /> CHẠY MÔ PHỎNG
                    </button>
                  </div>
                  
                  <div className="space-y-10">
                    {/* Concentration controls */}
                    <div>
                      <div className="text-sm mb-5 text-white/70">Nồng độ ban đầu (mol/L)</div>
                      <div className="space-y-7">
                        {Object.keys(simConc).map(key => (
                          <div key={key}>
                            <div className="flex items-center justify-between text-xs mb-2">
                              <span className="font-mono text-zinc-400">{key}</span>
                              <span className="tabular-nums font-medium text-white">{simConc[key as keyof typeof simConc].toFixed(1)}</span>
                            </div>
                            <input 
                              type="range" 
                              min="0" 
                              max={key === "NH3" ? 5 : 8} 
                              step="0.1"
                              value={simConc[key as keyof typeof simConc]}
                              onChange={(e) => setSimConc({
                                ...simConc, 
                                [key]: parseFloat(e.target.value)
                              })}
                              className="w-full accent-teal-400"
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Temperature */}
                    <div>
                      <div className="flex justify-between text-xs mb-4">
                        <div className="flex items-center gap-2">
                          <ThermometerSun className="h-4 w-4 text-orange-400" />
                          <span>Nhiệt độ</span>
                        </div>
                        <span className="font-mono text-orange-400">{temperature} °C</span>
                      </div>
                      <input 
                        type="range" 
                        min="200" 
                        max="700" 
                        value={temperature}
                        onChange={(e) => {
                          setTemperature(parseInt(e.target.value));
                          runLeChatelier();
                        }}
                        className="w-full accent-orange-400"
                      />
                      <div className="flex justify-between text-[10px] text-zinc-500 mt-1">
                        <div>Exothermic</div>
                        <div>Endothermic</div>
                      </div>
                    </div>

                    {/* Volume / Pressure */}
                    <div>
                      <div className="flex justify-between text-xs mb-4">
                        <div>Thể tích bình phản ứng</div>
                        <span className="font-mono text-sky-400">{volume} L</span>
                      </div>
                      <input 
                        type="range" 
                        min="2" 
                        max="30" 
                        value={volume}
                        onChange={(e) => {
                          setVolume(parseInt(e.target.value));
                          runLeChatelier();
                        }}
                        className="w-full accent-sky-400"
                      />
                      <div className="text-[10px] text-zinc-500 flex justify-between mt-1">
                        <div>Áp suất cao</div>
                        <div>Áp suất thấp</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Results panel */}
                {simData.length > 0 && (
                  <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8">
                    <div className="text-xs font-mono text-teal-400 mb-6">KẾT QUẢ MÔ PHỎNG</div>
                    
                    <ResponsiveContainer width="100%" height={210}>
                      <BarChart data={simData.slice(0, 8)}>
                        <CartesianGrid strokeDasharray="2 3" stroke="#27272a"/>
                        <XAxis dataKey="time" stroke="#52525b" fontSize={10} />
                        <YAxis stroke="#52525b" fontSize={10} />
                        <Tooltip contentStyle={{backgroundColor: '#09090b', border: 'none'}} />
                        <Bar dataKey="N2" fill="#22d3ee" radius={4} />
                        <Bar dataKey="H2" fill="#67e8f9" radius={4} />
                        <Bar dataKey="NH3" fill="#c026d3" radius={4} />
                      </BarChart>
                    </ResponsiveContainer>
                    
                    <div className="text-[10px] text-center text-zinc-500 mt-4">Nồng độ thay đổi theo thời gian (Le Chatelier shift)</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* LEARN TAB */}
        {activeTab === 'learn' && (
          <div className="max-w-4xl mx-auto">
            <div className="mb-16">
              <h2 className="text-6xl font-semibold tracking-tighter mb-4">Kiến Thức Cơ Bản</h2>
              <p className="text-xl text-zinc-400">Hiểu sâu hơn về cân bằng hóa học</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-zinc-900 rounded-3xl p-10 space-y-8 border border-zinc-800">
                <div className="flex items-center gap-5">
                  <div className="shrink-0 h-12 w-12 bg-violet-500/10 text-violet-400 rounded-2xl flex items-center justify-center">Kc</div>
                  <div>
                    <div className="font-semibold text-xl">Hằng số cân bằng Kc</div>
                    <div className="text-sm text-zinc-400">Kc = [Sản phẩm]^coeff / [Phản ứng]^coeff</div>
                  </div>
                </div>
                <div className="text-zinc-400 text-[15px] leading-relaxed">
                  Khi tốc độ phản ứng thuận và nghịch bằng nhau, hệ thống đạt trạng thái cân bằng động. 
                  Giá trị Kc cho biết mức độ phản ứng diễn ra. Kc &gt; 1 nghĩa là sản phẩm chiếm ưu thế.
                </div>
                <div className="pt-4 border-t border-zinc-700 text-xs font-mono text-teal-400">Ví dụ: Haber Process Kc ≈ 0.0005 (ở 450°C)</div>
              </div>

              <div className="bg-zinc-900 rounded-3xl p-10 space-y-8 border border-zinc-800">
                <div className="flex items-center gap-5">
                  <div className="shrink-0 h-12 w-12 bg-amber-500/10 text-amber-400 rounded-2xl flex items-center justify-center">
                    <ArrowRightLeft className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="font-semibold text-xl">Nguyên tắc Le Chatelier</div>
                    <div className="text-sm text-zinc-400">Hệ cân bằng sẽ phản ứng để giảm thiểu sự thay đổi</div>
                  </div>
                </div>
                <ul className="space-y-6 text-sm">
                  <li className="flex gap-4">
                    <div className="text-emerald-400 mt-1">⬆︎</div>
                    <div>Tăng nồng độ chất phản ứng → cân bằng dịch sang phải</div>
                  </li>
                  <li className="flex gap-4">
                    <div className="text-rose-400 mt-1">⬇︎</div>
                    <div>Tăng nhiệt độ cho phản ứng toả nhiệt → dịch sang trái</div>
                  </li>
                  <li className="flex gap-4">
                    <div className="text-sky-400 mt-1">📦</div>
                    <div>Giảm thể tích (tăng áp suất) → dịch sang phía ít phân tử khí hơn</div>
                  </li>
                </ul>
              </div>
            </div>

            <div className="mt-8 bg-zinc-900/70 border border-zinc-800 rounded-3xl p-12 text-center">
              <div className="mx-auto max-w-xs">
                <Beaker className="mx-auto h-16 w-16 text-teal-400 mb-8" />
                <div className="text-2xl font-medium mb-6">Cân bằng hóa học là trạng thái động</div>
                <div className="text-zinc-400">
                  Các phân tử tiếp tục phản ứng nhưng tốc độ thuận = tốc độ nghịch. 
                  Công cụ này giúp bạn hình dung và dự đoán cách hệ thống phản ứng với các thay đổi.
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="bg-black border-t border-zinc-900 py-8 text-center text-xs text-zinc-500">
        EquiChem — Công cụ giáo dục minh họa cân bằng hóa học • Được xây dựng với React + Recharts + Tailwind
        <div className="mt-3 text-[10px]">Dành cho mục đích minh họa và học tập. Kết quả mô phỏng gần đúng.</div>
      </footer>
    </div>
  );
}
