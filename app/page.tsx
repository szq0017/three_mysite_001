'use client'

import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { OutlinePass } from 'three/examples/jsm/postprocessing/OutlinePass.js'
import {
    CSS3DRenderer,
    CSS3DObject,
} from 'three/examples/jsm/renderers/CSS3DRenderer.js'
import { Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import * as TWEEN from '@tweenjs/tween.js'
import { FPSCamera } from '@/components/FPSCamera'

export default function Component() {
    const containerRef = useRef<HTMLDivElement>(null)
    const [isMenuOpen, setIsMenuOpen] = useState(false)
    const [selectedContent, setSelectedContent] = useState<THREE.Mesh | null>(
        null,
    )
    const [isContentMode, setIsContentMode] = useState(false)

    // カメラとコントロールの状態を���
    const [camera, setCamera] = useState<THREE.PerspectiveCamera | null>(null)
    const [controls, setControls] = useState<OrbitControls | null>(null)

    useEffect(() => {
        if (!containerRef.current) return

        // Scene setup
        const scene = new THREE.Scene()
        const newCamera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            1000,
        )
        const renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true,
        })

        renderer.setSize(window.innerWidth, window.innerHeight)
        renderer.setPixelRatio(window.devicePixelRatio)
        containerRef.current.appendChild(renderer.domElement)

        // CSS3D Renderer setup
        const css3DRenderer = new CSS3DRenderer()
        css3DRenderer.setSize(window.innerWidth, window.innerHeight)
        css3DRenderer.domElement.style.position = 'absolute'
        css3DRenderer.domElement.style.top = '0'
        containerRef.current.appendChild(css3DRenderer.domElement)

        // Grid helper for cyberpunk effect
        const gridSize = 100
        const gridDivisions = 100
        const grid = new THREE.GridHelper(
            gridSize,
            gridDivisions,
            0xe6ffff,
            0xe6ffff,
        )
        grid.position.y = 0
        scene.add(grid)
        grid.material.opacity = 0.2
        grid.material.transparent = true

        // Lighting
        const ambientLight = new THREE.AmbientLight(0xe6ffff, 0.5)
        scene.add(ambientLight)

        const pointLight = new THREE.PointLight(0x00ffff, 1)
        pointLight.position.set(5, 5, 5)
        scene.add(pointLight)

        // カメラの初期設定
        newCamera.position.set(0, 15, 30)
        setCamera(newCamera)

        // コントロールの初期設定
        const newControls = new OrbitControls(newCamera, renderer.domElement)
        newControls.enableDamping = true
        newControls.dampingFactor = 0.05
        newControls.screenSpacePanning = true
        newControls.minDistance = 1
        newControls.maxDistance = 100
        newControls.maxPolarAngle = Math.PI
        newControls.enableZoom = false
        newControls.enableRotate = false
        newControls.enablePan = false
        setControls(newControls)

        // Post-processing
        const composer = new EffectComposer(renderer)
        const renderPass = new RenderPass(scene, newCamera)
        composer.addPass(renderPass)

        const bloomPass = new UnrealBloomPass(
            new THREE.Vector2(window.innerWidth, window.innerHeight),
            1.5,
            0.4,
            0.85,
        )
        composer.addPass(bloomPass)

        const outlinePass = new OutlinePass(
            new THREE.Vector2(window.innerWidth, window.innerHeight),
            scene,
            newCamera,
        )
        outlinePass.edgeStrength = 3
        outlinePass.edgeGlow = 0.7
        outlinePass.edgeThickness = 1
        outlinePass.visibleEdgeColor.set('#ffffff')
        outlinePass.hiddenEdgeColor.set('#190a05')
        composer.addPass(outlinePass)

        // Content panels
        const contentGeometry = new THREE.PlaneGeometry(2, 1)
        const contentMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ffff,
            transparent: true,
            opacity: 0.5,
            side: THREE.DoubleSide,
        })
        const contentPanels: THREE.Mesh[] = []

        for (let i = 0; i < 5; i++) {
            const panel = new THREE.Mesh(contentGeometry, contentMaterial)
            panel.position.set(
                Math.random() * 10 - 5,
                Math.random() * 5,
                Math.random() * 10 - 5,
            )
            panel.lookAt(newCamera.position)
            scene.add(panel)
            contentPanels.push(panel)
        }

        // News Panel in 3D space
        const newsPanel = document.createElement('div')
        newsPanel.className =
            'bg-teal-600/90 backdrop-blur-sm p-6 rounded-lg shadow-lg border border-teal-400/30 w-80'
        newsPanel.innerHTML = `
          <h2 class="text-2xl font-bold text-white mb-4">新着情報</h2>
          <div class="space-y-4">
            ${Array(6)
                .fill(0)
                .map(
                    () => `
              <div class="text-white">
                <div class="text-sm text-teal-200">2024.11.15</div>
                <div class="text-white hover:text-teal-200 transition-colors cursor-pointer">
                  イベントのご案内
                </div>
              </div>
            `,
                )
                .join('')}
          </div>
        `
        const newsObject = new CSS3DObject(newsPanel)
        newsObject.position.set(15, 5, -15)
        newsObject.rotation.y = -Math.PI / 4
        newsObject.scale.set(0.02, 0.02, 0.02)
        scene.add(newsObject)

        // Raycaster for interaction
        const raycaster = new THREE.Raycaster()
        const mouse = new THREE.Vector2()

        const onMouseMoveInteraction = (event: MouseEvent) => {
            mouse.x = (event.clientX / window.innerWidth) * 2 - 1
            mouse.y = -(event.clientY / window.innerHeight) * 2 + 1

            raycaster.setFromCamera(mouse, newCamera)
            const intersects = raycaster.intersectObjects(contentPanels)

            if (intersects.length > 0) {
                const intersectedObject = intersects[0].object as THREE.Mesh
                outlinePass.selectedObjects = [intersectedObject]
            } else {
                outlinePass.selectedObjects = []
            }
        }

        const onMouseClick = (event: MouseEvent) => {
            if (isContentMode) {
                setIsContentMode(false)
                setSelectedContent(null)
                controls!.enabled = true
                return
            }

            mouse.x = (event.clientX / window.innerWidth) * 2 - 1
            mouse.y = -(event.clientY / window.innerHeight) * 2 + 1

            raycaster.setFromCamera(mouse, newCamera)
            const intersects = raycaster.intersectObjects(contentPanels)

            if (intersects.length > 0) {
                const intersectedObject = intersects[0].object as THREE.Mesh
                setSelectedContent(intersectedObject)
                setIsContentMode(true)
                controls!.enabled = false

                // カメラの位置を調整
                const targetPosition = new THREE.Vector3().copy(
                    intersectedObject.position,
                )
                targetPosition.add(new THREE.Vector3(0, 0, 3)) // カメラをコンテンツの少し後ろに移動

                new TWEEN.Tween(newCamera.position)
                    .to(targetPosition, 1000)
                    .easing(TWEEN.Easing.Quadratic.Out)
                    .start()
            }
        }

        // Animation
        const animate = () => {
            requestAnimationFrame(animate)

            // Animate content panels
            contentPanels.forEach((panel, index) => {
                panel.position.y += Math.sin(Date.now() * 0.001 + index) * 0.001
                panel.lookAt(newCamera.position)
            })

            // Make newsObject face the camera
            newsObject.lookAt(newCamera.position)

            TWEEN.update()
            composer.render()
            css3DRenderer.render(scene, newCamera)
        }

        animate()

        // Responsive design
        const onWindowResize = () => {
            newCamera.aspect = window.innerWidth / window.innerHeight
            newCamera.updateProjectionMatrix()
            renderer.setSize(window.innerWidth, window.innerHeight)
            css3DRenderer.setSize(window.innerWidth, window.innerHeight)
            composer.setSize(window.innerWidth, window.innerHeight)
        }

        window.addEventListener('resize', onWindowResize)
        window.addEventListener('mousemove', onMouseMoveInteraction)
        window.addEventListener('click', onMouseClick)

        // Cleanup
        return () => {
            // window.removeEventListener('wheel', onwheel)
            // window.removeEventListener('mousedown', onmousedown)
            // window.removeEventListener('mousemove', onmousemove)
            // window.removeEventListener('mouseup', onmouseup)
            // window.removeEventListener('touchstart', ontouchstart)
            // window.removeEventListener('touchmove', ontouchmove)
            // window.removeEventListener('touchend', ontouchend)
            window.removeEventListener('mousemove', onMouseMoveInteraction)
            window.removeEventListener('click', onMouseClick)
            window.removeEventListener('resize', onWindowResize)
            containerRef.current?.removeChild(renderer.domElement)
            containerRef.current?.removeChild(css3DRenderer.domElement)
            renderer.dispose()
        }
    }, [isContentMode])

    return (
        <div className="relative h-screen w-full overflow-hidden bg-black">
            {/* THREE.js container */}
            <div ref={containerRef} className="absolute inset-0 touch-none" />

            {/* FPSカメラコンポーネントをレンダリング */}
            {camera && controls && (
                <FPSCamera
                    camera={camera}
                    controls={controls}
                    isContentMode={isContentMode}
                />
            )}

            {/* Header */}
            <header className="relative z-10 flex items-center justify-between px-6 py-4 bg-black/50 backdrop-blur-sm">
                <h1 className="text-2xl font-bold text-white">
                    My Site&apos;s LOGO
                </h1>
                <nav className="hidden md:flex items-center gap-6 text-white">
                    <a
                        href="#blog"
                        className="hover:text-cyan-400 transition-colors"
                    >
                        ブログ
                    </a>
                    <a
                        href="#news"
                        className="hover:text-cyan-400 transition-colors"
                    >
                        新着情報
                    </a>
                    <a
                        href="#works"
                        className="hover:text-cyan-400 transition-colors"
                    >
                        WORKS
                    </a>
                    <a
                        href="#contact"
                        className="hover:text-cyan-400 transition-colors"
                    >
                        お問い合わせ
                    </a>
                </nav>
                <Button
                    variant="ghost"
                    size="icon"
                    className="md:hidden text-white"
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                >
                    <Menu className="h-6 w-6" />
                </Button>
            </header>

            {/* Mobile menu */}
            {isMenuOpen && (
                <div className="relative z-10 md:hidden bg-black/90 backdrop-blur-sm">
                    <nav className="flex flex-col items-center gap-4 py-4 text-white">
                        <a
                            href="#blog"
                            className="hover:text-cyan-400 transition-colors"
                        >
                            ブログ
                        </a>
                        <a
                            href="#news"
                            className="hover:text-cyan-400 transition-colors"
                        >
                            新着情報
                        </a>
                        <a
                            href="#works"
                            className="hover:text-cyan-400 transition-colors"
                        >
                            WORKS
                        </a>
                        <a
                            href="#contact"
                            className="hover:text-cyan-400 transition-colors"
                        >
                            お問い合わせ
                        </a>
                    </nav>
                </div>
            )}

            {/* Accessibility controls */}
            <div className="absolute left-6 bottom-6 z-10">
                <Button
                    variant="outline"
                    size="sm"
                    className="text-white border-white hover:bg-white hover:text-black"
                    onClick={() => {
                        document.body.classList.toggle('high-contrast')
                    }}
                >
                    High Contrast
                </Button>
            </div>

            {/* Selected content display */}
            {selectedContent && (
                <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20 bg-black/80 text-white p-6 rounded-lg max-w-md">
                    <h3 className="text-xl font-bold mb-2">Selected Content</h3>
                    <p>
                        This is where the content for the selected panel would
                        be displayed.
                    </p>
                    <Button
                        variant="outline"
                        size="sm"
                        className="mt-4 text-white border-white hover:bg-white hover:text-black"
                        onClick={() => {
                            setSelectedContent(null)
                            setIsContentMode(false)
                        }}
                    >
                        Close
                    </Button>
                </div>
            )}
        </div>
    )
}
