import {useEffect, useRef, type ReactNode} from 'react';

type HomeFlowSceneProps = {
  className?: string;
};

export default function HomeFlowScene({className}: HomeFlowSceneProps): ReactNode {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    const canvas = canvasRef.current;
    if (!host || !canvas) {
      return undefined;
    }

    let cancelled = false;
    let disposeScene: (() => void) | undefined;

    void import('three').then((THREE) => {
      if (cancelled) {
        return;
      }

      let renderer: InstanceType<typeof THREE.WebGLRenderer>;
      try {
        renderer = new THREE.WebGLRenderer({
          alpha: true,
          antialias: true,
          canvas,
          powerPreference: 'high-performance',
        });
      } catch {
        host.dataset.sceneStatus = 'unsupported';
        return;
      }

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 40);
      const flowGroup = new THREE.Group();
      const clock = new THREE.Clock();
      const pointer = new THREE.Vector2();
      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
      let animationFrame = 0;

      camera.position.set(0, 0, 11.2);
      renderer.setClearColor(0x000000, 0);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      scene.add(flowGroup);

      const primaryMaterials: InstanceType<typeof THREE.MeshBasicMaterial>[] = [];
      const accentMaterials: InstanceType<typeof THREE.MeshBasicMaterial>[] = [];
      const warmMaterials: InstanceType<typeof THREE.MeshBasicMaterial>[] = [];
      const lineMaterials: InstanceType<typeof THREE.MeshBasicMaterial>[] = [];

      const createMaterial = (
        collection: InstanceType<typeof THREE.MeshBasicMaterial>[],
        opacity: number,
      ) => {
        const material = new THREE.MeshBasicMaterial({
          color: 0xffffff,
          depthWrite: false,
          transparent: true,
          opacity,
        });
        collection.push(material);
        return material;
      };

      const flowDefinitions = [
        {
          color: 'primary' as const,
          points: [[-7.2, 2.7, -1.2], [-5.2, 2.15, 0], [-3.65, 2.55, 0.25], [-1.85, 1.45, -0.35]],
          speed: 0.055,
        },
        {
          color: 'accent' as const,
          points: [[-7.1, -2.15, -0.4], [-5.15, -1.45, 0.25], [-3.4, -2.1, 0], [-1.8, -0.95, -0.25]],
          speed: 0.068,
        },
        {
          color: 'warm' as const,
          points: [[-1.85, 1.45, -0.35], [-0.7, 0.7, 0.1], [0.35, 0.25, -0.4], [1.7, 1.15, -0.15]],
          speed: 0.05,
        },
        {
          color: 'primary' as const,
          points: [[-1.8, -0.95, -0.25], [-0.55, -0.35, 0.15], [0.35, 0.25, -0.4], [1.7, 1.15, -0.15]],
          speed: 0.061,
        },
        {
          color: 'accent' as const,
          points: [[1.7, 1.15, -0.15], [3.2, 2.05, 0.35], [4.75, 1.35, 0], [7.1, 2.35, -0.7]],
          speed: 0.058,
        },
        {
          color: 'primary' as const,
          points: [[0.35, 0.25, -0.4], [2.2, -0.85, 0.1], [4.1, -1.7, 0.25], [7.2, -1.75, -0.8]],
          speed: 0.064,
        },
      ];

      const flows = flowDefinitions.map((definition, index) => {
        const curve = new THREE.CatmullRomCurve3(
          definition.points.map(([x, y, z]) => new THREE.Vector3(x, y, z)),
        );
        const materialCollection =
          definition.color === 'accent'
            ? accentMaterials
            : definition.color === 'warm'
              ? warmMaterials
              : lineMaterials;
        const tube = new THREE.Mesh(
          new THREE.TubeGeometry(curve, 72, 0.029, 6, false),
          createMaterial(materialCollection, definition.color === 'warm' ? 0.52 : 0.4),
        );
        flowGroup.add(tube);

        const particleCollection =
          definition.color === 'accent'
            ? accentMaterials
            : definition.color === 'warm'
              ? warmMaterials
              : primaryMaterials;
        const particle = new THREE.Mesh(
          new THREE.SphereGeometry(definition.color === 'warm' ? 0.11 : 0.085, 14, 14),
          createMaterial(particleCollection, 0.96),
        );
        flowGroup.add(particle);

        return {
          curve,
          offset: index * 0.17,
          particle,
          speed: definition.speed,
        };
      });

      const nodePositions = [
        [-5.2, 2.15, 0], [-3.65, 2.55, 0.25], [-5.15, -1.45, 0.25],
        [-3.4, -2.1, 0], [-1.85, 1.45, -0.35], [-1.8, -0.95, -0.25],
        [1.7, 1.15, -0.15], [3.2, 2.05, 0.35], [4.75, 1.35, 0],
        [2.2, -0.85, 0.1], [4.1, -1.7, 0.25],
      ];
      const nodeGeometry = new THREE.SphereGeometry(0.125, 18, 18);
      const ringGeometry = new THREE.TorusGeometry(0.235, 0.018, 8, 32);

      nodePositions.forEach(([x, y, z], index) => {
        const collection = index % 3 === 1 ? accentMaterials : primaryMaterials;
        const node = new THREE.Mesh(nodeGeometry, createMaterial(collection, 0.92));
        node.position.set(x, y, z);
        flowGroup.add(node);

        if (index % 2 === 0) {
          const ring = new THREE.Mesh(ringGeometry, createMaterial(collection, 0.42));
          ring.position.copy(node.position);
          ring.rotation.x = Math.PI * 0.5;
          flowGroup.add(ring);
        }
      });

      const core = new THREE.Group();
      const coreShell = new THREE.Mesh(
        new THREE.IcosahedronGeometry(1.15, 2),
        new THREE.MeshBasicMaterial({
          color: 0xffffff,
          transparent: true,
          opacity: 0.24,
          wireframe: true,
          depthWrite: false,
        }),
      );
      const coreNode = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.16, 0),
        createMaterial(warmMaterials, 0.96),
      );
      const coreRing = new THREE.Mesh(
        new THREE.TorusGeometry(1.42, 0.022, 8, 72),
        createMaterial(accentMaterials, 0.48),
      );
      core.position.set(0.35, 0.25, -0.4);
      coreRing.rotation.x = Math.PI * 0.62;
      coreRing.rotation.y = Math.PI * 0.15;
      core.add(coreShell, coreNode, coreRing);
      flowGroup.add(core);

      const cursorTarget = new THREE.Vector3();
      const cursorSignal = new THREE.Group();
      const cursorDotMaterial = createMaterial(accentMaterials, 0.72);
      const cursorRingMaterial = createMaterial(primaryMaterials, 0.34);
      const cursorDot = new THREE.Mesh(
        new THREE.SphereGeometry(0.085, 14, 14),
        cursorDotMaterial,
      );
      const cursorRing = new THREE.Mesh(
        new THREE.TorusGeometry(0.28, 0.016, 8, 40),
        cursorRingMaterial,
      );
      cursorRing.rotation.x = Math.PI * 0.5;
      cursorSignal.add(cursorDot, cursorRing);
      cursorSignal.visible = false;
      flowGroup.add(cursorSignal);

      const applyTheme = () => {
        const dark = document.documentElement.dataset.theme === 'dark';
        const colors = dark
          ? {primary: 0x9da7ff, accent: 0x63d7e8, warm: 0xffb34d, line: 0x7f8cf5}
          : {primary: 0x5968e8, accent: 0x21a9c4, warm: 0xf28c18, line: 0x6976df};
        primaryMaterials.forEach((material) => material.color.setHex(colors.primary));
        accentMaterials.forEach((material) => material.color.setHex(colors.accent));
        warmMaterials.forEach((material) => material.color.setHex(colors.warm));
        lineMaterials.forEach((material) => material.color.setHex(colors.line));
        coreShell.material.color.setHex(colors.primary);
      };

      const resize = () => {
        const {width, height} = host.getBoundingClientRect();
        if (width === 0 || height === 0) {
          return;
        }
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, width < 700 ? 1.25 : 1.75));
        renderer.setSize(width, height, false);
        camera.aspect = width / height;
        camera.position.z = width < 700 ? 13.2 : 11.2;
        camera.updateProjectionMatrix();
        flowGroup.scale.setScalar(width < 700 ? 0.92 : 1.08);
      };

      const render = () => {
        renderer.render(scene, camera);
        host.dataset.sceneStatus = 'ready';
      };

      const animate = () => {
        const elapsed = clock.getElapsedTime();
        flowGroup.rotation.y += (pointer.x * 0.16 - flowGroup.rotation.y) * 0.045;
        flowGroup.rotation.x += (-pointer.y * 0.09 - flowGroup.rotation.x) * 0.045;
        camera.position.x += (pointer.x * 0.34 - camera.position.x) * 0.035;
        camera.position.y += (-pointer.y * 0.2 - camera.position.y) * 0.035;
        core.rotation.x = pointer.y * 0.28;
        core.rotation.y = elapsed * 0.22 + pointer.x * 0.4;
        core.rotation.z = Math.sin(elapsed * 0.3) * 0.12;
        cursorSignal.position.lerp(cursorTarget, 0.08);
        cursorRing.rotation.z = elapsed * 0.55;
        flows.forEach((flow) => {
          const progress = (elapsed * flow.speed + flow.offset) % 1;
          flow.particle.position.copy(flow.curve.getPointAt(progress));
        });
        render();
        animationFrame = window.requestAnimationFrame(animate);
      };

      const handlePointerMove = (event: PointerEvent) => {
        const bounds = host.getBoundingClientRect();
        const x = ((event.clientX - bounds.left) / bounds.width - 0.5) * 2;
        const y = ((event.clientY - bounds.top) / bounds.height - 0.5) * 2;
        pointer.set(THREE.MathUtils.clamp(x, -1, 1), THREE.MathUtils.clamp(y, -1, 1));
        cursorTarget.set(pointer.x * 5.8, -pointer.y * 3.1, 0.45);
        cursorSignal.visible = event.clientY >= bounds.top && event.clientY <= bounds.bottom;
      };

      const handleMotionPreference = () => {
        window.cancelAnimationFrame(animationFrame);
        clock.start();
        if (reduceMotion.matches) {
          flows.forEach((flow) => flow.particle.position.copy(flow.curve.getPointAt(flow.offset)));
          render();
        } else {
          animate();
        }
      };

      const resizeObserver = new ResizeObserver(resize);
      const themeObserver = new MutationObserver(() => {
        applyTheme();
        render();
      });
      resizeObserver.observe(host);
      themeObserver.observe(document.documentElement, {attributes: true, attributeFilter: ['data-theme']});
      reduceMotion.addEventListener('change', handleMotionPreference);
      window.addEventListener('pointermove', handlePointerMove, {passive: true});
      applyTheme();
      resize();
      handleMotionPreference();

      disposeScene = () => {
        window.cancelAnimationFrame(animationFrame);
        window.removeEventListener('pointermove', handlePointerMove);
        reduceMotion.removeEventListener('change', handleMotionPreference);
        resizeObserver.disconnect();
        themeObserver.disconnect();
        scene.traverse((object) => {
          if (!(object instanceof THREE.Mesh)) {
            return;
          }
          object.geometry.dispose();
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          materials.forEach((material) => material.dispose());
        });
        renderer.dispose();
      };
    });

    return () => {
      cancelled = true;
      disposeScene?.();
    };
  }, []);

  return (
    <div ref={hostRef} className={className} aria-hidden="true">
      <canvas ref={canvasRef} />
    </div>
  );
}
