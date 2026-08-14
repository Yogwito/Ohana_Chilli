import { useEffect, useRef } from 'react';

export default function HeroIngredientsScene() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    let disposed = false;
    let animationFrame = 0;
    let resizeObserver: ResizeObserver | undefined;
    let visibilityObserver: IntersectionObserver | undefined;
    let removePointerListener = () => {};

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isMobile = window.matchMedia('(max-width: 767px)').matches;

    // La escena es decorativa y three.js pesa ~734 kB (186 kB gzip). Antes se
    // descargaba siempre y de inmediato: con reduced-motion se bajaba entero
    // para luego no animar nada, y en el resto de casos competía con la imagen
    // del hero justo durante el LCP. Ahora no se pide si el usuario pidió menos
    // movimiento, y en los demás casos se espera a que el hilo principal esté
    // libre. El resultado visual es el mismo, un instante más tarde.
    if (reduceMotion) return;

    let cancelIdle = () => {};
    const whenIdle = (run: () => void) => {
      if (typeof window.requestIdleCallback === 'function') {
        const id = window.requestIdleCallback(run, { timeout: 2000 });
        cancelIdle = () => window.cancelIdleCallback?.(id);
        return;
      }
      const id = window.setTimeout(run, 300);
      cancelIdle = () => window.clearTimeout(id);
    };

    whenIdle(() => void (async () => {
      const THREE = await import('three');
      if (disposed || !mountRef.current) return;
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
      camera.position.set(0, 0, isMobile ? 8.2 : 7.1);

      const renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: !isMobile,
        powerPreference: 'high-performance',
      });
      renderer.setClearColor(0x000000, 0);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.35 : 1.75));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.shadowMap.enabled = !isMobile;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.domElement.setAttribute('aria-hidden', 'true');
      renderer.domElement.dataset.heroWebgl = 'active';
      mount.appendChild(renderer.domElement);

      scene.add(new THREE.HemisphereLight(0xfff5d6, 0x08251c, 1.8));
      const keyLight = new THREE.DirectionalLight(0xffe6a1, 2.5);
      keyLight.position.set(-4, 5, 6);
      keyLight.castShadow = !isMobile;
      scene.add(keyLight);

      const composition = new THREE.Group();
      composition.position.set(isMobile ? 1.65 : 2.65, isMobile ? 0.75 : 0.25, 0);
      scene.add(composition);

      const lime = new THREE.Group();
      const limeRind = new THREE.Mesh(
        new THREE.CylinderGeometry(0.74, 0.74, 0.12, 40),
        new THREE.MeshPhysicalMaterial({
          color: 0x78a83f,
          roughness: 0.55,
          clearcoat: 0.35,
        }),
      );
      limeRind.rotation.x = Math.PI / 2;
      const limeFlesh = new THREE.Mesh(
        new THREE.CircleGeometry(0.61, 40),
        new THREE.MeshPhysicalMaterial({
          color: 0xbdd467,
          roughness: 0.52,
          clearcoat: 0.2,
          side: THREE.DoubleSide,
        }),
      );
      limeFlesh.position.z = 0.07;
      lime.add(limeRind, limeFlesh);
      lime.position.set(isMobile ? 0.2 : 0.55, isMobile ? 1.45 : 1.8, 0.2);
      lime.rotation.set(-0.12, 0.28, -0.25);
      lime.scale.setScalar(isMobile ? 0.72 : 0.92);
      composition.add(lime);

      const avocado = new THREE.Group();
      const avocadoSkin = new THREE.Mesh(
        new THREE.SphereGeometry(0.72, 32, 24),
        new THREE.MeshPhysicalMaterial({ color: 0x416b33, roughness: 0.78 }),
      );
      avocadoSkin.scale.set(0.82, 1.2, 0.25);
      const avocadoFlesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.62, 32, 24),
        new THREE.MeshPhysicalMaterial({ color: 0x8fb34d, roughness: 0.7 }),
      );
      avocadoFlesh.scale.set(0.82, 1.2, 0.2);
      avocadoFlesh.position.z = 0.18;
      const avocadoPit = new THREE.Mesh(
        new THREE.SphereGeometry(0.25, 24, 16),
        new THREE.MeshPhysicalMaterial({ color: 0x8e5034, roughness: 0.82 }),
      );
      avocadoPit.position.z = 0.4;
      avocado.add(avocadoSkin, avocadoFlesh, avocadoPit);
      avocado.position.set(isMobile ? 0.65 : 1.2, isMobile ? -1.5 : -1.65, -0.2);
      avocado.rotation.set(0.08, -0.35, 0.4);
      avocado.scale.setScalar(isMobile ? 0.68 : 0.9);
      composition.add(avocado);

      const corn = new THREE.Group();
      const kernelGeometry = new THREE.SphereGeometry(0.18, 18, 12);
      const kernelMaterial = new THREE.MeshPhysicalMaterial({
        color: 0xe9bb32,
        roughness: 0.5,
        clearcoat: 0.25,
      });
      const kernelPositions = [
        [-0.44, 0.12, 0],
        [0, 0.3, 0.16],
        [0.42, 0.1, -0.04],
        [-0.2, -0.25, 0.12],
        [0.25, -0.22, 0],
      ];
      kernelPositions.forEach(([x, y, z], index) => {
        const kernel = new THREE.Mesh(kernelGeometry, kernelMaterial);
        kernel.position.set(x, y, z);
        kernel.scale.set(1, 0.72, 0.78);
        kernel.rotation.z = index * 0.4;
        corn.add(kernel);
      });
      corn.position.set(isMobile ? -0.2 : -0.35, isMobile ? -0.45 : -0.1, 0.35);
      corn.rotation.z = -0.25;
      corn.scale.setScalar(isMobile ? 0.7 : 0.9);
      composition.add(corn);

      composition.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.castShadow = !isMobile;
          child.receiveShadow = !isMobile;
        }
      });

      const pointerTarget = new THREE.Vector2(0, 0);
      const pointerCurrent = new THREE.Vector2(0, 0);
      const onPointerMove = (event: PointerEvent) => {
        pointerTarget.set(
          (event.clientX / window.innerWidth - 0.5) * 0.22,
          (event.clientY / window.innerHeight - 0.5) * 0.16,
        );
      };
      if (!reduceMotion) {
        window.addEventListener('pointermove', onPointerMove, { passive: true });
        removePointerListener = () => window.removeEventListener('pointermove', onPointerMove);
      }

      let isVisible = true;
      visibilityObserver = new IntersectionObserver(([entry]) => {
        isVisible = entry.isIntersecting;
      }, { threshold: 0.01 });
      visibilityObserver.observe(mount);

      const resize = () => {
        const { width, height } = mount.getBoundingClientRect();
        if (!width || !height) return;
        renderer.setSize(width, height, false);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
      };
      resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(mount);
      resize();

      const clock = new THREE.Clock();
      const render = () => {
        if (disposed) return;

        if (isVisible) {
          const elapsed = clock.getElapsedTime();
          pointerCurrent.lerp(pointerTarget, 0.045);
          composition.rotation.y = pointerCurrent.x + Math.sin(elapsed * 0.35) * 0.08;
          composition.rotation.x = -pointerCurrent.y + Math.cos(elapsed * 0.28) * 0.035;
          lime.rotation.z = -0.25 + Math.sin(elapsed * 0.55) * 0.12;
          avocado.rotation.z = 0.4 + Math.cos(elapsed * 0.48) * 0.1;
          corn.position.y = (isMobile ? -0.45 : -0.1) + Math.sin(elapsed * 0.7) * 0.08;
          renderer.render(scene, camera);
        }

        if (!reduceMotion) animationFrame = window.requestAnimationFrame(render);
      };
      render();

      if (reduceMotion) renderer.render(scene, camera);

      const disposeScene = () => {
        scene.traverse((child) => {
          if (!(child instanceof THREE.Mesh)) return;
          child.geometry.dispose();
          const materials = Array.isArray(child.material) ? child.material : [child.material];
          materials.forEach((material) => material.dispose());
        });
      };

      removePointerListener = (() => {
        const previous = removePointerListener;
        return () => {
          previous();
          disposeScene();
          renderer.dispose();
          renderer.domElement.remove();
        };
      })();
    })());

    return () => {
      disposed = true;
      cancelIdle();
      window.cancelAnimationFrame(animationFrame);
      resizeObserver?.disconnect();
      visibilityObserver?.disconnect();
      removePointerListener();
    };
  }, []);

  return (
    <div
      ref={mountRef}
      className="h-full w-full [&_canvas]:block [&_canvas]:h-full [&_canvas]:w-full"
      aria-hidden="true"
    />
  );
}
