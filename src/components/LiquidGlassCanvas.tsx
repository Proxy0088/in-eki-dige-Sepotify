import React, { useEffect, useRef } from 'react';

export interface ActiveRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface LiquidGlassCanvasProps {
  activeRect?: ActiveRect | null;
  className?: string;
}

const VERTEX_SHADER_SOURCE = `
attribute vec2 a_position;
void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

const FRAGMENT_SHADER_SOURCE = `
#ifdef GL_ES
precision highp float;
#endif

uniform vec2 u_resolution;
uniform vec2 u_pointer;
uniform float u_pointer_active;
uniform float u_time;
uniform vec4 u_active_rect; // x, y, width, height (in CSS pixels * dpr)
uniform float u_is_light;

// Rounded box SDF (p relative to box center, b is half-size, r is corner radius)
float sdRoundedBox(vec2 p, vec2 b, float r) {
  vec2 q = abs(p) - b + vec2(r);
  return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - r;
}

// Exact 2D normal vector for a capsule / rounded box
vec2 calcBoxNormal(vec2 p, vec2 b, float r) {
  vec2 q = abs(p) - b + vec2(r);
  vec2 s = sign(p);
  if (q.x > 0.0 && q.y > 0.0) {
    return s * normalize(q);
  } else if (q.x > q.y) {
    return vec2(s.x, 0.0);
  } else {
    return vec2(0.0, s.y);
  }
}

void main() {
  // Flip Y to match CSS DOM coordinates (0,0 is top-left)
  vec2 p = vec2(gl_FragCoord.x, u_resolution.y - gl_FragCoord.y);
  vec2 size = u_resolution;
  vec2 center = size * 0.5;
  vec2 halfSize = size * 0.5;
  float cornerRadius = min(halfSize.x, halfSize.y);

  // Outer container SDF distance
  float dist = sdRoundedBox(p - center, halfSize, cornerRadius);

  // Antialiased capsule boundary
  float dockAlpha = 1.0 - smoothstep(-0.8, 0.6, dist);
  if (dockAlpha <= 0.001) {
    discard;
  }

  // Physical bevel profile along container perimeter
  float bevelWidth = min(16.0, cornerRadius * 0.85);
  float distInside = max(-dist, 0.0);
  float bevelT = clamp(distInside / bevelWidth, 0.0, 1.0);

  // Normal for perimeter: curves down toward edge
  vec2 pRel = p - center;
  vec2 n2d = calcBoxNormal(pRel, halfSize, cornerRadius);
  float slope = (1.0 - bevelT) * 1.7;
  vec3 N = normalize(vec3(-n2d.x * slope, -n2d.y * slope, 1.0));

  // Active tab liquid bubble deformation (when activeRect is provided)
  if (u_active_rect.z > 0.0) {
    vec2 actCenter = u_active_rect.xy + u_active_rect.zw * 0.5;
    vec2 actHalf = u_active_rect.zw * 0.5;
    float actR = min(actHalf.x, actHalf.y);
    vec2 pActRel = p - actCenter;
    float distAct = sdRoundedBox(pActRel, actHalf, actR);

    // Liquid meniscus around the active tab
    if (distAct < actR * 0.4) {
      vec2 actN2d = calcBoxNormal(pActRel, actHalf, actR);
      float actBevel = clamp(-distAct / (actR * 0.75), 0.0, 1.0);
      float actSlope = sin(actBevel * 3.14159265) * 0.60;
      N = normalize(N + vec3(actN2d.x * actSlope, actN2d.y * actSlope, 0.0));
    }
  }

  vec3 V = vec3(0.0, 0.0, 1.0);

  // 1. Directional Overhead Light (top glass rim catch-light)
  vec3 L_over = normalize(vec3(0.0, -1.0, 0.65));
  vec3 H_over = normalize(L_over + V);
  float specOver = pow(max(dot(N, H_over), 0.0), 32.0) * 0.40;

  // 2. Calm, refined interactive pointer light (toned down intensity as requested)
  vec2 defaultLight = vec2(center.x, center.y - 10.0);
  vec2 lightPos = mix(defaultLight, u_pointer, u_pointer_active);
  vec2 lightDir2D = (lightPos - p) / max(size.x, size.y);
  vec3 L_ptr = normalize(vec3(lightDir2D * 2.2, 0.55));
  vec3 H_ptr = normalize(L_ptr + V);
  
  // Toned down from 0.95 to 0.35 sharp and 0.18 soft
  float specPtrSharp = pow(max(dot(N, H_ptr), 0.0), 48.0) * 0.35;
  float specPtrSoft = pow(max(dot(N, H_ptr), 0.0), 16.0) * 0.18;
  float specPtr = (specPtrSharp + specPtrSoft) * (0.28 + 0.35 * u_pointer_active);

  // 3. Fresnel reflection (glass edge rim)
  float fresnel = pow(1.0 - max(N.z, 0.0), 3.0) * 0.36;

  // 4. Optical chromatic dispersion along curved boundaries
  vec3 dispersion = vec3(
    fresnel * 1.05 + specOver * 0.95,
    fresnel * 0.95 + specOver * 1.00,
    fresnel * 1.15 + specOver * 1.05
  );

  // 5. Subtle ambient liquid shimmer
  float shimmer = sin(p.x * 0.05 + u_time * 0.7) * cos(p.y * 0.07 + u_time * 0.4) * 0.02;

  // 6. Bottom ambient inner depth / soft occlusion
  float bottomEdge = smoothstep(size.y - bevelWidth * 1.4, size.y, p.y) * 0.20;

  // Combine specular and edge reflections
  vec3 highlights = vec3(specPtr) + dispersion * 0.55 + shimmer;

  // Output: strictly preserve underlying dock color, overlaying refined liquid glass optics
  if (u_is_light > 0.5) {
    vec3 col = vec3(1.0) + highlights * 0.40 - bottomEdge * 0.25;
    float alpha = clamp((specOver + specPtr) * 0.35 + fresnel * 0.30, 0.0, 0.65);
    gl_FragColor = vec4(col, alpha * dockAlpha);
  } else {
    vec3 col = vec3(1.0) + highlights * 0.60 - vec3(bottomEdge);
    float alpha = clamp((specOver + specPtr) * 0.42 + fresnel * 0.38, 0.0, 0.70);
    gl_FragColor = vec4(col, alpha * dockAlpha);
  }
}
`;

export const LiquidGlassCanvas: React.FC<LiquidGlassCanvasProps> = ({
  activeRect = null,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const parent = canvas.parentElement;
    if (!parent) return;

    // Check for reduced motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // WebGL initialization
    const gl =
      canvas.getContext('webgl2', { alpha: true, antialias: true, premultipliedAlpha: true }) ||
      (canvas.getContext('webgl', {
        alpha: true,
        antialias: true,
        premultipliedAlpha: true,
      }) as WebGLRenderingContext | null);

    if (!gl) {
      canvas.style.display = 'none';
      return;
    }

    // Compile helper
    const createShader = (type: number, source: string) => {
      const shader = gl.createShader(type);
      if (!shader) return null;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.warn('LiquidGlass compile error:', gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    };

    const vertShader = createShader(gl.VERTEX_SHADER, VERTEX_SHADER_SOURCE);
    const fragShader = createShader(gl.FRAGMENT_SHADER, FRAGMENT_SHADER_SOURCE);
    if (!vertShader || !fragShader) {
      canvas.style.display = 'none';
      return;
    }

    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vertShader);
    gl.attachShader(program, fragShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.warn('LiquidGlass link error:', gl.getProgramInfoLog(program));
      gl.deleteProgram(program);
      canvas.style.display = 'none';
      return;
    }

    gl.useProgram(program);

    // Quad geometry (triangle strip)
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
      gl.STATIC_DRAW
    );

    const aPositionLoc = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(aPositionLoc);
    gl.vertexAttribPointer(aPositionLoc, 2, gl.FLOAT, false, 0, 0);

    // Uniform locations
    const uResolutionLoc = gl.getUniformLocation(program, 'u_resolution');
    const uPointerLoc = gl.getUniformLocation(program, 'u_pointer');
    const uPointerActiveLoc = gl.getUniformLocation(program, 'u_pointer_active');
    const uTimeLoc = gl.getUniformLocation(program, 'u_time');
    const uActiveRectLoc = gl.getUniformLocation(program, 'u_active_rect');
    const uIsLightLoc = gl.getUniformLocation(program, 'u_is_light');

    // Pointer state tracking
    const pointer = {
      x: 0,
      y: 0,
      targetX: 0,
      targetY: 0,
      active: 0,
      targetActive: 0,
    };

    // Smooth active rect interpolation state
    const currentActiveRect = {
      x: 0,
      y: 0,
      w: 0,
      h: 0,
    };

    let targetActiveRect = activeRect;

    let width = 0;
    let height = 0;
    let dpr = 1;

    const resize = () => {
      const rect = parent.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = Math.round(rect.width * dpr);
      height = Math.round(rect.height * dpr);

      if (width > 0 && height > 0) {
        if (canvas.width !== width || canvas.height !== height) {
          canvas.width = width;
          canvas.height = height;
          gl.viewport(0, 0, width, height);
        }
      }
    };

    resize();
    const resizeObserver = new ResizeObserver(() => resize());
    resizeObserver.observe(parent);

    // Pointer event listeners on the container
    const onPointerMove = (e: PointerEvent) => {
      const rect = parent.getBoundingClientRect();
      pointer.targetX = (e.clientX - rect.left) * dpr;
      pointer.targetY = (e.clientY - rect.top) * dpr;
      pointer.targetActive = 1.0;
      wakeLoop();
    };

    const onPointerEnter = (e: PointerEvent) => {
      const rect = parent.getBoundingClientRect();
      pointer.targetX = (e.clientX - rect.left) * dpr;
      pointer.targetY = (e.clientY - rect.top) * dpr;
      pointer.targetActive = 1.0;
      wakeLoop();
    };

    const onPointerLeave = () => {
      pointer.targetActive = 0.0;
      wakeLoop();
    };

    parent.addEventListener('pointermove', onPointerMove, { passive: true });
    parent.addEventListener('pointerenter', onPointerEnter, { passive: true });
    parent.addEventListener('pointerleave', onPointerLeave, { passive: true });

    // Animation loop with automatic idle-sleep
    let animationFrameId: number | null = null;
    let isLoopRunning = false;
    let idleFrames = 0;
    const startTime = performance.now();

    const render = () => {
      if (!canvas || !gl) return;

      const elapsed = (performance.now() - startTime) / 1000;

      // Smooth pointer interpolation
      const lerpSpeed = prefersReducedMotion ? 1.0 : 0.14;
      pointer.x += (pointer.targetX - pointer.x) * lerpSpeed;
      pointer.y += (pointer.targetY - pointer.y) * lerpSpeed;
      pointer.active += (pointer.targetActive - pointer.active) * lerpSpeed;

      // Smooth active rect interpolation
      if (targetActiveRect) {
        const tx = targetActiveRect.x * dpr;
        const ty = targetActiveRect.y * dpr;
        const tw = targetActiveRect.width * dpr;
        const th = targetActiveRect.height * dpr;

        currentActiveRect.x += (tx - currentActiveRect.x) * 0.18;
        currentActiveRect.y += (ty - currentActiveRect.y) * 0.18;
        currentActiveRect.w += (tw - currentActiveRect.w) * 0.18;
        currentActiveRect.h += (th - currentActiveRect.h) * 0.18;
      } else {
        currentActiveRect.w = 0;
        currentActiveRect.h = 0;
      }

      // Check light theme
      const isLight = document.documentElement.classList.contains('light') ? 1.0 : 0.0;

      // Render shader pass
      gl.useProgram(program);
      gl.uniform2f(uResolutionLoc, width, height);
      gl.uniform2f(uPointerLoc, pointer.x, pointer.y);
      gl.uniform1f(uPointerActiveLoc, pointer.active);
      gl.uniform1f(uTimeLoc, prefersReducedMotion ? 0.0 : elapsed);
      gl.uniform4f(
        uActiveRectLoc,
        currentActiveRect.x,
        currentActiveRect.y,
        currentActiveRect.w,
        currentActiveRect.h
      );
      gl.uniform1f(uIsLightLoc, isLight);

      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

      // Sleep detection: when settled, sleep after 30 idle frames
      const pointerDiff =
        Math.abs(pointer.targetX - pointer.x) +
        Math.abs(pointer.targetY - pointer.y) +
        Math.abs(pointer.targetActive - pointer.active);
      const rectDiff = targetActiveRect
        ? Math.abs(targetActiveRect.x * dpr - currentActiveRect.x) +
          Math.abs(targetActiveRect.width * dpr - currentActiveRect.w)
        : 0;

      if (pointerDiff < 0.2 && rectDiff < 0.2 && pointer.active < 0.02) {
        idleFrames++;
        if (idleFrames > 30) {
          isLoopRunning = false;
          animationFrameId = null;
          return;
        }
      } else {
        idleFrames = 0;
      }

      animationFrameId = requestAnimationFrame(render);
    };

    const wakeLoop = () => {
      idleFrames = 0;
      if (!isLoopRunning) {
        isLoopRunning = true;
        animationFrameId = requestAnimationFrame(render);
      }
    };

    wakeLoop();

    // Context loss / restoration handling
    const onContextLost = (e: Event) => {
      e.preventDefault();
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      isLoopRunning = false;
    };
    const onContextRestored = () => {
      resize();
      wakeLoop();
    };

    canvas.addEventListener('webglcontextlost', onContextLost, false);
    canvas.addEventListener('webglcontextrestored', onContextRestored, false);

    const updateActiveRect = (rect: ActiveRect | null) => {
      targetActiveRect = rect;
      wakeLoop();
    };

    (canvas as unknown as { _updateActiveRect: typeof updateActiveRect })._updateActiveRect =
      updateActiveRect;

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      parent.removeEventListener('pointermove', onPointerMove);
      parent.removeEventListener('pointerenter', onPointerEnter);
      parent.removeEventListener('pointerleave', onPointerLeave);
      canvas.removeEventListener('webglcontextlost', onContextLost);
      canvas.removeEventListener('webglcontextrestored', onContextRestored);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas && '_updateActiveRect' in canvas) {
      (
        canvas as unknown as { _updateActiveRect: (r: ActiveRect | null) => void }
      )._updateActiveRect(activeRect ?? null);
    }
  }, [activeRect]);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 w-full h-full pointer-events-none rounded-full overflow-hidden ${className}`}
      style={{ zIndex: 1 }}
      aria-hidden="true"
    />
  );
};
