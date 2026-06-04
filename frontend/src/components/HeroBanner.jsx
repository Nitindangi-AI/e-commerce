import { Link } from "react-router-dom";
import { useEffect, useRef } from "react";

export default function HeroBanner() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    let animationFrameId;

    // Config parameters
    let columns = 30;
    let rows = 18;
    const colors = {
      gold: "rgba(201, 168, 76, 0.12)",
      goldLine: "rgba(201, 168, 76, 0.04)"
    };

    // Handle responsive sizing & density
    const width = window.innerWidth;
    const isMobile = width < 768;

    if (isMobile) {
      columns = 12;
      rows = 8;
    } else if (width < 1024) {
      columns = 20;
      rows = 14;
    }

    let particles = [];
    let mouse = { x: -1000, y: -1000, active: false };

    // Setup function to initialize/resize
    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
      initGrid(rect.width, rect.height);
    };

    const initGrid = (w, h) => {
      particles = [];
      const colSpacing = w / (columns - 1);
      const rowSpacing = h / (rows - 1);

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < columns; c++) {
          const x = c * colSpacing;
          const y = r * rowSpacing;
          particles.push({
            x: x,
            y: y,
            originalX: x,
            originalY: y,
            vx: 0,
            vy: 0,
            row: r,
            col: c
          });
        }
      }
    };

    const handleMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
      mouse.active = true;
    };

    const handleMouseLeave = () => {
      mouse.active = false;
      mouse.x = -1000;
      mouse.y = -1000;
    };

    if (!isMobile) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseleave", handleMouseLeave);
    }

    window.addEventListener("resize", resizeCanvas);
    
    // Run initial sizing
    resizeCanvas();

    // 3D Diamond Geometry definition for cinematic luxury effect
    const diamondVertices = [];
    // 0: top table center
    diamondVertices.push({ x: 0, y: 0.55, z: 0 });

    // 1-8: upper crown ring
    for (let i = 0; i < 8; i++) {
      const angle = (i * Math.PI) / 4;
      diamondVertices.push({
        x: Math.cos(angle) * 0.35,
        y: 0.35,
        z: Math.sin(angle) * 0.35
      });
    }

    // 9-16: girdle ring
    for (let i = 0; i < 8; i++) {
      const angle = (i * Math.PI) / 4;
      diamondVertices.push({
        x: Math.cos(angle) * 0.65,
        y: 0.08,
        z: Math.sin(angle) * 0.65
      });
    }

    // 17: bottom culet
    diamondVertices.push({ x: 0, y: -0.65, z: 0 });

    const diamondEdges = [];
    // Connect table to crown
    for (let i = 1; i <= 8; i++) {
      diamondEdges.push([0, i]);
    }
    // Connect crown ring
    for (let i = 1; i <= 8; i++) {
      const next = i === 8 ? 1 : i + 1;
      diamondEdges.push([i, next]);
    }
    // Connect crown to girdle (vertical and diagonals for facet look)
    for (let i = 1; i <= 8; i++) {
      const gCurr = i + 8;
      const gNext = (i === 8 ? 1 : i + 1) + 8;
      diamondEdges.push([i, gCurr]);
      diamondEdges.push([i, gNext]);
    }
    // Connect girdle ring
    for (let i = 9; i <= 16; i++) {
      const next = i === 16 ? 9 : i + 1;
      diamondEdges.push([i, next]);
    }
    // Connect girdle to culet
    for (let i = 9; i <= 16; i++) {
      diamondEdges.push([i, 17]);
    }

    let diamondRotX = 0.28;
    let diamondRotY = 0;

    let time = 0;
    const render = () => {
      time += 0.025;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const w = canvas.width / window.devicePixelRatio;
      const h = canvas.height / window.devicePixelRatio;
      const cx = w / 2;
      const cy = h / 2;

      // 3D Diamond parallax rotation settings
      let targetRotY = time * 0.22;
      let targetRotX = 0.28;

      if (mouse.active) {
        const normX = (mouse.x - cx) / cx;
        const normY = (mouse.y - cy) / cy;
        targetRotY = time * 0.22 + normX * 0.45;
        targetRotX = 0.28 - normY * 0.35;
      }

      diamondRotX += (targetRotX - diamondRotX) * 0.05;
      diamondRotY += (targetRotY - diamondRotY) * 0.05;

      const cosX = Math.cos(diamondRotX);
      const sinX = Math.sin(diamondRotX);
      const cosY = Math.cos(diamondRotY);
      const sinY = Math.sin(diamondRotY);

      // Responsive scale for the diamond
      const scale = Math.min(w, h) * (isMobile ? 0.35 : 0.28);
      const projected = [];

      for (let i = 0; i < diamondVertices.length; i++) {
        const v = diamondVertices[i];

        // 3D rotation math
        const x1 = v.x * cosY - v.z * sinY;
        const z1 = v.x * sinY + v.z * cosY;

        const y2 = v.y * cosX - z1 * sinX;
        const z2 = v.y * sinX + z1 * cosX;

        // Perspective Projection
        const fov = 350;
        const perspective = fov / (fov + z2);
        
        // Slow float offset
        const floatOffset = Math.sin(time * 0.6) * 12;
        
        const screenX = cx + x1 * scale * perspective;
        const screenY = cy - y2 * scale * perspective + floatOffset;

        projected.push({ x: screenX, y: screenY, z: z2 });
      }

      // 1. Draw glowing background radial gradient under the diamond
      const grad = ctx.createRadialGradient(cx, cy, 10, cx, cy, scale * 0.85);
      grad.addColorStop(0, "rgba(201, 168, 76, 0.07)");
      grad.addColorStop(0.5, "rgba(201, 168, 76, 0.02)");
      grad.addColorStop(1, "rgba(201, 168, 76, 0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, scale * 0.85, 0, Math.PI * 2);
      ctx.fill();

      // Physics variables for the grid
      const spring = 0.035;
      const friction = 0.88;
      const mouseRadius = 150;
      const mouseForce = 0.85;

      // 2. Update grid particles
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        if (isMobile) {
          // Slow waving wave pattern for mobile
          const waveX = Math.sin(time + p.col * 0.5) * 6;
          const waveY = Math.cos(time + p.row * 0.5) * 6;
          p.x = p.originalX + waveX;
          p.y = p.originalY + waveY;
        } else {
          // Spring force back to base position
          const dxBase = p.originalX - p.x;
          const dyBase = p.originalY - p.y;
          
          p.vx += dxBase * spring;
          p.vy += dyBase * spring;

          // Mouse push force
          if (mouse.active) {
            const dxMouse = p.x - mouse.x;
            const dyMouse = p.y - mouse.y;
            const dist = Math.sqrt(dxMouse * dxMouse + dyMouse * dyMouse);

            if (dist < mouseRadius && dist > 1) {
              const force = (1 - dist / mouseRadius) * mouseForce;
              const angle = Math.atan2(dyMouse, dxMouse);
              p.vx += Math.cos(angle) * force;
              p.vy += Math.sin(angle) * force;
            }
          }

          // Apply velocity & friction
          p.vx *= friction;
          p.vy *= friction;
          p.x += p.vx;
          p.y += p.vy;
        }
      }

      // 3. Draw grid lines
      ctx.beginPath();
      ctx.strokeStyle = colors.goldLine;
      ctx.lineWidth = 0.5;

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < columns; c++) {
          const idx = r * columns + c;
          const p = particles[idx];

          if (c + 1 < columns) {
            const pRight = particles[idx + 1];
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(pRight.x, pRight.y);
          }
          if (r + 1 < rows) {
            const pBottom = particles[idx + columns];
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(pBottom.x, pBottom.y);
          }
        }
      }
      ctx.stroke();

      // 4. Draw grid dots
      ctx.fillStyle = colors.gold;
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
        ctx.fill();
      }

      // 5. Draw 3D Diamond Wireframe
      ctx.beginPath();
      ctx.lineWidth = 0.85;
      ctx.strokeStyle = "rgba(201, 168, 76, 0.16)";

      for (let i = 0; i < diamondEdges.length; i++) {
        const [startIdx, endIdx] = diamondEdges[i];
        const startNode = projected[startIdx];
        const endNode = projected[endIdx];
        
        ctx.moveTo(startNode.x, startNode.y);
        ctx.lineTo(endNode.x, endNode.y);
      }
      ctx.stroke();

      // 6. Draw 3D Diamond Nodes (glowing stars)
      for (let i = 0; i < projected.length; i++) {
        const node = projected[i];
        const size = Math.max(1, 2.5 * (350 / (350 + node.z)));
        
        ctx.beginPath();
        ctx.arc(node.x, node.y, size, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(201, 168, 76, 0.45)";
        ctx.fill();
        
        ctx.beginPath();
        ctx.arc(node.x, node.y, size * 2.5, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(201, 168, 76, 0.08)";
        ctx.fill();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      if (!isMobile) {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseleave", handleMouseLeave);
      }
      window.removeEventListener("resize", resizeCanvas);
    };
  }, []);

  return (
    <section className="relative min-h-[100vh] flex items-center justify-center overflow-hidden bg-[#FAFAF8] dark:bg-[#0A0A0A]">
      {/* 3D Canvas Animation Background */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none z-0"
        style={{ width: "100%", height: "100%" }}
      />

      {/* Dark/Light overlay gradient for readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#FAFAF8]/30 via-transparent to-[#FAFAF8] dark:from-[#0A0A0A]/30 dark:via-transparent dark:to-[#0A0A0A] pointer-events-none z-0" />
      
      {/* Background accents (kept subtle) */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#C9A84C]/3 rounded-full blur-[140px] pointer-events-none z-0" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-[#C9A84C]/2 rounded-full blur-[120px] pointer-events-none z-0" />

      {/* Content */}
      <div className="relative z-10 text-center px-6 max-w-4xl mx-auto hero-fade-in">
        {/* Eyebrow */}
        <p className="text-[10px] tracking-[0.4em] uppercase text-[#C9A84C] font-semibold mb-6">
          Premium Fashion · Curated Collections
        </p>

        {/* Main Headline */}
        <h1 className="font-display text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold text-[#0A0A0A] dark:text-white leading-tight tracking-tight mb-6 uppercase">
          WEAR THE TREND.
        </h1>

        {/* Subtitle */}
        <p className="text-[#6B6B6B] dark:text-gray-400 text-base md:text-lg font-normal max-w-md mx-auto mb-10 leading-relaxed">
          Premium fashion. Curated for you.
        </p>

        {/* CTAs */}
        <div className="flex items-center justify-center gap-4 flex-wrap">
          <Link
            to="/shop"
            className="bg-[#C9A84C] hover:bg-[#B5963F] text-[#FAFAF8] px-8 py-4 rounded-full text-xs tracking-[0.2em] uppercase font-bold shadow-[0_4px_16px_rgba(201,168,76,0.25)] hover:shadow-[0_8px_28px_rgba(201,168,76,0.35)] hover:-translate-y-0.5 active:scale-95 transition-all duration-300"
          >
            Shop Now
          </Link>
          <Link
            to="/shop"
            className="border border-[#E8E8E8] dark:border-white/10 text-[#111111] dark:text-white hover:border-[#C9A84C] hover:text-[#C9A84C] px-8 py-4 rounded-full text-xs tracking-[0.2em] uppercase font-bold hover:-translate-y-0.5 active:scale-95 transition-all duration-300"
          >
            Explore Collections
          </Link>
        </div>

        {/* Scroll indicator */}
        <div className="mt-16 flex flex-col items-center gap-2 opacity-40">
          <span className="text-[9px] tracking-[0.3em] uppercase text-[#6B6B6B] dark:text-gray-400 font-medium">Scroll</span>
          <div className="w-px h-8 bg-gradient-to-b from-[#6B6B6B] to-transparent" />
        </div>
      </div>
    </section>
  );
}
