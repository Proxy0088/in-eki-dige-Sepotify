import React, { useEffect, useRef } from 'react';

export interface ActiveRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface LiquidGlassCanvasProps {
  activeRect: ActiveRect | null;
  className?: string;
}

// Exact preset values from liquid-glass-2026-11-03T11-31-46.json
const PRESET = {
  refThickness: 42.0,
  refFactor: 1.4,
  refDispersion: 7.0,
  refFresnelRange: 53.13,
  refFresnelHardness: 59.82,
  refFresnelFactor: 20.0,
  glareRange: 16.58,
  glareHardness: 100.0,
  glareFactor: 56.04,
  glareConvergence: 100.0,
  glareOppositeFactor: 100.0,
  glareAngle: -42.75,
  blurRadius: 1.0,
  shadowExpand: 25.0,
  shadowFactor: 15.0,
  shadowOffsetY: -10.0,
  shapeRoundness: 5.0,
  mergeRate: 0.05,
  cursorRadius: 16.0,
};

const VERTEX_SHADER_SOURCE = `#version 300 es
precision highp float;

in vec2 a_position;
out vec2 v_uv;

void main() {
  v_uv = a_position * 0.5 + 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

const FRAGMENT_SHADER_SOURCE = `#version 300 es
precision highp float;

in vec2 v_uv;
out vec4 fragColor;

// Canvas & viewport
uniform vec2 u_resolution;
uniform float u_dpr;
uniform vec2 u_mouse;
uniform float u_mouse_active;

// Elements: 0 = dock, 1 = active pill
uniform vec4 u_elements[2]; // center.x, center.y, width, height
uniform float u_cornerRadii[2];

// Liquid Glass Controls (ported directly from ShapeMerge & liquid-glass-2026-11-03T11-31-46.json)
uniform float u_mergeRate;          // 0.05
uniform float u_roundness;          // 5.0 (superellipse factor)
uniform float u_cursorRadius;       // 16.0

uniform float u_refThickness;       // 42.0
uniform float u_refFactor;          // 1.4
uniform float u_refDispersion;      // 7.0
uniform float u_refFresnelRange;    // 53.13
uniform float u_refFresnelHardness; // 59.82
uniform float u_refFresnelFactor;   // 20.0

uniform float u_glareRange;         // 16.58
uniform float u_glareHardness;      // 100.0
uniform float u_glareFactor;        // 56.04
uniform float u_glareAngle;         // -42.75
uniform float u_glareConvergence;   // 100.0
uniform float u_glareOppositeFactor;// 100.0

uniform float u_shadowExpand;       // 25.0
uniform float u_shadowFactor;       // 15.0
uniform vec2 u_shadowOffset;        // vec2(0.0, -10.0)

// --- SDF Functions (ShapeMerge) ---

float smin(float a, float b, float k) {
  float k_safe = max(k, 0.001);
  float h = clamp(0.5 + 0.5 * (b - a) / k_safe, 0.0, 1.0);
  return mix(b, a, h) - k_safe * h * (1.0 - h);
}

// Superellipse continuous corner SDF (Apple squircle curvature, n = 5.0)
float superellipseCornerSDF(vec2 p, float r, float n) {
  p = abs(p);
  float v = pow(pow(p.x, n) + pow(p.y, n), 1.0 / n);
  return v - r;
}

float roundedRectSDF(vec2 p, vec2 center, float width, float height, float cornerRadius, float n) {
  p -= center;
  float cr = cornerRadius;
  vec2 halfSize = vec2(width, height) * 0.5;
  vec2 d = abs(p) - halfSize;
  
  float dist;
  if (d.x > -cr && d.y > -cr) {
    vec2 cornerCenter = sign(p) * (halfSize - vec2(cr));
    vec2 cornerP = p - cornerCenter;
    dist = superellipseCornerSDF(cornerP, cr, n);
  } else {
    dist = min(max(d.x, d.y), 0.0) + length(max(d, 0.0));
  }
  
  return dist;
}

float map(vec2 p) {
  // Dock container (Element 0)
  vec4 elem0 = u_elements[0];
  float finalSDF = roundedRectSDF(p, elem0.xy, elem0.z, elem0.w, u_cornerRadii[0], u_roundness);

  // Active navigation pill (Element 1)
  if (u_elements[1].z > 0.0) {
    vec4 elem1 = u_elements[1];
    float pillSDF = roundedRectSDF(p, elem1.xy, elem1.z, elem1.w, u_cornerRadii[1], u_roundness);
    finalSDF = smin(finalSDF, pillSDF, u_mergeRate * 1000.0 * u_dpr);
  }

  // Pointer / touch interaction (Cursor droplet merging)
  if (u_mouse_active > 0.01) {
    float cursorRadius = u_cursorRadius * u_dpr;
    float cursorSDF = length(p - u_mouse) - cursorRadius;
    finalSDF = smin(finalSDF, cursorSDF, u_mergeRate * 750.0 * u_dpr * u_mouse_active);
  }

  return finalSDF;
}

vec2 getNormal(vec2 p) {
  vec2 h = vec2(1.0, 0.0);
  return normalize(vec2(
    map(p + h.xy) - map(p - h.xy),
    map(p + h.yx) - map(p - h.yx)
  ));
}

void main() {
  vec2 p = gl_FragCoord.xy;
  // Flip Y to match CSS DOM coordinates (0,0 is top-left)
  p.y = u_resolution.y - p.y;

  float merged = map(p);
  float nmerged = -merged; // Positive inside

  // Scale refThickness proportionally to the dock height (matches the 506x234 reference playground)
  float effectiveThickness = max(u_refThickness * (u_elements[0].w / 234.0), 10.0 * u_dpr);

  if (merged < 0.0) {
    // Inside the liquid glass shape
    vec2 normal = getNormal(p);

    // Refraction Edge Factor (exact Snell's Law curvature from ShapeMerge)
    float x_R_ratio = 1.0 - nmerged / effectiveThickness;
    float thetaI = asin(clamp(pow(max(x_R_ratio, 0.0), 2.0), 0.0, 1.0));
    float thetaT = asin(clamp((1.0 / u_refFactor) * sin(thetaI), -1.0, 1.0));
    float edgeFactor = -1.0 * tan(thetaT - thetaI);
    if (nmerged >= effectiveThickness) {
      edgeFactor = 0.0;
    }

    // Chromatic Dispersion (exact coefficients from Liquid Glass Studio)
    const float N_R = 1.0 - 0.02;
    const float N_G = 1.0;
    const float N_B = 1.0 + 0.02;
    float dispFactor = u_refDispersion * 0.02;
    vec3 dispOffsets = vec3(
      1.0 - (N_R - 1.0) * dispFactor,
      1.0 - (N_G - 1.0) * dispFactor,
      1.0 - (N_B - 1.0) * dispFactor
    );

    // Fresnel Reflection at grazing edges
    float fresnelBase = 1.0 + merged / 1500.0 * (500.0 / u_refFresnelRange) * (500.0 / u_refFresnelRange) + u_refFresnelHardness / 100.0;
    float fresnelFactor = clamp(pow(max(fresnelBase, 0.0), 5.0), 0.0, 1.0) * (u_refFresnelFactor / 100.0) * 0.7;

    // Glare / Specular Highlight (at exact angle -42.75 deg with hardness 100 and convergence 100)
    float glareAngleRad = radians(u_glareAngle);
    vec2 glareDir = vec2(cos(glareAngleRad), sin(glareAngleRad));
    float glareAngleFactor = clamp(dot(normal, glareDir), 0.0, 1.0);
    float glareOppositeAngleFactor = clamp(dot(normal, -glareDir), 0.0, 1.0);

    float glareEdgeMask = smoothstep(effectiveThickness, 0.0, nmerged);
    float glareBase = 1.0 + merged / 1500.0 * (500.0 / u_glareRange) * (500.0 / u_glareRange) + u_glareHardness / 100.0;
    float glareGeoFactor = clamp(pow(max(glareBase, 0.0), 5.0 * (u_glareConvergence / 100.0) * 10.0), 0.0, 1.0);

    float mainGlare = glareAngleFactor * glareGeoFactor * (u_glareFactor / 100.0);
    float oppositeGlare = glareOppositeAngleFactor * glareGeoFactor * (u_glareOppositeFactor / 100.0);
    float totalGlare = (mainGlare + oppositeGlare) * glareEdgeMask;

    // Compose prismatic specular reflections
    vec3 glareCol = vec3(
      totalGlare * dispOffsets.r,
      totalGlare * dispOffsets.g,
      totalGlare * dispOffsets.b
    );

    vec3 fresnelCol = vec3(
      fresnelFactor * dispOffsets.r,
      fresnelFactor * dispOffsets.g,
      fresnelFactor * dispOffsets.b
    );

    // Subtle edge refraction glint
    float edgeGlint = abs(edgeFactor) * 0.32;

    // Anti-aliased outer rim
    float antialias = 1.0 - smoothstep(-0.8, 0.2, merged);

    vec3 finalGlint = glareCol * 1.1 + fresnelCol * 0.75 + vec3(edgeGlint);
    float alpha = clamp(totalGlare * 0.95 + fresnelFactor * 0.65 + edgeGlint * 0.35, 0.0, 0.95);

    fragColor = vec4(finalGlint, alpha * antialias);
  } else {
    // Outside shape: soft drop-shadow from preset (shadowOffset 0, -10, shadowExpand 25, shadowFactor 15)
    vec2 shadowPos = p - u_shadowOffset * u_dpr;
    float shadowDist = map(shadowPos);
    if (shadowDist < 0.0) {
      float shadowIntensity = smoothstep(0.0, -u_shadowExpand * u_dpr, shadowDist);
      float shadowA = shadowIntensity * (u_shadowFactor / 100.0) * 0.35;
      fragColor = vec4(0.0, 0.0, 0.0, shadowA);
    } else {
      discard;
    }
  }
}
`;

export const LiquidGlassCanvas: React.FC<LiquidGlassCanvasProps> = ({
  activeRect,
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

    // WebGL2 context
    const gl = canvas.getContext('webgl2', {
      alpha: true,
      antialias: true,
      premultipliedAlpha: true,
    });

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
        console.warn('LiquidGlass shader compile error:', gl.getShaderInfoLog(shader));
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
    const uDprLoc = gl.getUniformLocation(program, 'u_dpr');
    const uMouseLoc = gl.getUniformLocation(program, 'u_mouse');
    const uMouseActiveLoc = gl.getUniformLocation(program, 'u_mouse_active');
    const uElementsLoc = gl.getUniformLocation(program, 'u_elements');
    const uCornerRadiiLoc = gl.getUniformLocation(program, 'u_cornerRadii');

    const uMergeRateLoc = gl.getUniformLocation(program, 'u_mergeRate');
    const uRoundnessLoc = gl.getUniformLocation(program, 'u_roundness');
    const uCursorRadiusLoc = gl.getUniformLocation(program, 'u_cursorRadius');
    const uRefThicknessLoc = gl.getUniformLocation(program, 'u_refThickness');
    const uRefFactorLoc = gl.getUniformLocation(program, 'u_refFactor');
    const uRefDispersionLoc = gl.getUniformLocation(program, 'u_refDispersion');
    const uRefFresnelRangeLoc = gl.getUniformLocation(program, 'u_refFresnelRange');
    const uRefFresnelHardnessLoc = gl.getUniformLocation(program, 'u_refFresnelHardness');
    const uRefFresnelFactorLoc = gl.getUniformLocation(program, 'u_refFresnelFactor');
    const uGlareRangeLoc = gl.getUniformLocation(program, 'u_glareRange');
    const uGlareHardnessLoc = gl.getUniformLocation(program, 'u_glareHardness');
    const uGlareFactorLoc = gl.getUniformLocation(program, 'u_glareFactor');
    const uGlareAngleLoc = gl.getUniformLocation(program, 'u_glareAngle');
    const uGlareConvergenceLoc = gl.getUniformLocation(program, 'u_glareConvergence');
    const uGlareOppositeFactorLoc = gl.getUniformLocation(program, 'u_glareOppositeFactor');
    const uShadowExpandLoc = gl.getUniformLocation(program, 'u_shadowExpand');
    const uShadowFactorLoc = gl.getUniformLocation(program, 'u_shadowFactor');
    const uShadowOffsetLoc = gl.getUniformLocation(program, 'u_shadowOffset');

    // Static presets from JSON
    gl.uniform1f(uMergeRateLoc, PRESET.mergeRate);
    gl.uniform1f(uRoundnessLoc, PRESET.shapeRoundness);
    gl.uniform1f(uCursorRadiusLoc, PRESET.cursorRadius);
    gl.uniform1f(uRefThicknessLoc, PRESET.refThickness);
    gl.uniform1f(uRefFactorLoc, PRESET.refFactor);
    gl.uniform1f(uRefDispersionLoc, PRESET.refDispersion);
    gl.uniform1f(uRefFresnelRangeLoc, PRESET.refFresnelRange);
    gl.uniform1f(uRefFresnelHardnessLoc, PRESET.refFresnelHardness);
    gl.uniform1f(uRefFresnelFactorLoc, PRESET.refFresnelFactor);
    gl.uniform1f(uGlareRangeLoc, PRESET.glareRange);
    gl.uniform1f(uGlareHardnessLoc, PRESET.glareHardness);
    gl.uniform1f(uGlareFactorLoc, PRESET.glareFactor);
    gl.uniform1f(uGlareAngleLoc, PRESET.glareAngle);
    gl.uniform1f(uGlareConvergenceLoc, PRESET.glareConvergence);
    gl.uniform1f(uGlareOppositeFactorLoc, PRESET.glareOppositeFactor);
    gl.uniform1f(uShadowExpandLoc, PRESET.shadowExpand);
    gl.uniform1f(uShadowFactorLoc, PRESET.shadowFactor);
    gl.uniform2f(uShadowOffsetLoc, 0.0, PRESET.shadowOffsetY);

    // Mouse tracking
    const mouse = {
      x: 0,
      y: 0,
      targetX: 0,
      targetY: 0,
      active: 0,
      targetActive: 0,
    };

    // Smooth active rect spring interpolation
    const currentActive = {
      x: 0,
      y: 0,
      w: 0,
      h: 0,
    };

    let targetActive = activeRect;

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

    // Pointer events on parent dock
    const onPointerMove = (e: PointerEvent) => {
      const rect = parent.getBoundingClientRect();
      mouse.targetX = (e.clientX - rect.left) * dpr;
      mouse.targetY = (e.clientY - rect.top) * dpr;
      mouse.targetActive = 1.0;
      wakeLoop();
    };

    const onPointerEnter = (e: PointerEvent) => {
      const rect = parent.getBoundingClientRect();
      mouse.targetX = (e.clientX - rect.left) * dpr;
      mouse.targetY = (e.clientY - rect.top) * dpr;
      mouse.targetActive = 1.0;
      wakeLoop();
    };

    const onPointerLeave = () => {
      mouse.targetActive = 0.0;
      wakeLoop();
    };

    parent.addEventListener('pointermove', onPointerMove, { passive: true });
    parent.addEventListener('pointerenter', onPointerEnter, { passive: true });
    parent.addEventListener('pointerleave', onPointerLeave, { passive: true });

    // Render loop with idle sleep
    let animationFrameId: number | null = null;
    let isLoopRunning = false;
    let idleFrames = 0;

    const render = () => {
      if (!canvas || !gl) return;

      const lerpSpeed = prefersReducedMotion ? 1.0 : 0.16;
      mouse.x += (mouse.targetX - mouse.x) * lerpSpeed;
      mouse.y += (mouse.targetY - mouse.y) * lerpSpeed;
      mouse.active += (mouse.targetActive - mouse.active) * lerpSpeed;

      // Smooth active rect spring
      if (targetActive) {
        const tx = (targetActive.x + targetActive.width / 2) * dpr;
        const ty = (targetActive.y + targetActive.height / 2) * dpr;
        const tw = targetActive.width * dpr;
        const th = targetActive.height * dpr;

        currentActive.x += (tx - currentActive.x) * 0.22;
        currentActive.y += (ty - currentActive.y) * 0.22;
        currentActive.w += (tw - currentActive.w) * 0.22;
        currentActive.h += (th - currentActive.h) * 0.22;
      }

      // Elements array:
      // elem 0: dock container
      // elem 1: active pill
      const elementsData = new Float32Array([
        width / 2,
        height / 2,
        width,
        height, // elem 0 (center X, center Y, width, height)
        currentActive.x,
        currentActive.y,
        currentActive.w,
        currentActive.h, // elem 1
      ]);

      const cornerRadii = new Float32Array([
        height / 2, // dock radius
        currentActive.h > 0 ? currentActive.h / 2 : height / 2, // active pill radius
      ]);

      gl.useProgram(program);
      gl.uniform2f(uResolutionLoc, width, height);
      gl.uniform1f(uDprLoc, dpr);
      gl.uniform2f(uMouseLoc, mouse.x, mouse.y);
      gl.uniform1f(uMouseActiveLoc, mouse.active);
      gl.uniform4fv(uElementsLoc, elementsData);
      gl.uniform1fv(uCornerRadiiLoc, cornerRadii);

      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

      // Sleep when steady
      const mouseDelta =
        Math.abs(mouse.targetX - mouse.x) +
        Math.abs(mouse.targetY - mouse.y) +
        Math.abs(mouse.targetActive - mouse.active);
      const rectDelta = targetActive
        ? Math.abs((targetActive.x + targetActive.width / 2) * dpr - currentActive.x) +
          Math.abs(targetActive.width * dpr - currentActive.w)
        : 0;

      if (mouseDelta < 0.2 && rectDelta < 0.2 && mouse.active < 0.02) {
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

    // Context handling
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

    const updateActive = (rect: ActiveRect | null) => {
      targetActive = rect;
      wakeLoop();
    };

    (canvas as unknown as { _updateActive: typeof updateActive })._updateActive = updateActive;

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
    if (canvas && '_updateActive' in canvas) {
      (canvas as unknown as { _updateActive: (r: ActiveRect | null) => void })._updateActive(
        activeRect
      );
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
