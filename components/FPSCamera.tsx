import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

interface FPSCameraProps {
    camera: THREE.PerspectiveCamera
    controls: OrbitControls
    isContentMode: boolean
}

export const FPSCamera = ({
    camera,
    controls,
    isContentMode,
}: FPSCameraProps) => {
    const isDraggingRef = useRef(false)
    const previousMousePositionRef = useRef({ x: 0, y: 0 })
    const previousTouchPositionRef = useRef({ x: 0, y: 0 })
    const touchStartYRef = useRef(0)

    // 二本指ピンチ用の状態管理
    const initialPinchDistanceRef = useRef<number | null>(null)

    useEffect(() => {
        // 空間の制限値を設定
        const SPACE_LIMITS = {
            minY: 1, // 地面からの最小高さ
            maxY: 100, // 最大高さ
            boundarySize: 50, // XZ平面での移動制限
        }

        // 位置が有効かチェックする関数
        const isValidPosition = (position: THREE.Vector3): boolean => {
            if (
                position.y < SPACE_LIMITS.minY ||
                position.y > SPACE_LIMITS.maxY
            )
                return false
            const horizontalDistance = Math.sqrt(
                position.x * position.x + position.z * position.z,
            )
            if (horizontalDistance > SPACE_LIMITS.boundarySize) return false
            return true
        }

        // マウスホイールでの前後移動
        const onWheel = (event: WheelEvent) => {
            if (!isContentMode) {
                event.preventDefault()
                const direction = new THREE.Vector3()
                camera.getWorldDirection(direction)
                const moveSpeed = 0.5
                const newPosition = camera.position.clone()

                if (event.deltaY > 0) {
                    // 後ろに移動
                    newPosition.add(direction.multiplyScalar(moveSpeed))
                } else {
                    // 前に移動
                    newPosition.sub(direction.multiplyScalar(moveSpeed))
                }

                if (isValidPosition(newPosition)) {
                    camera.position.copy(newPosition)
                }
            }
        }

        // マウスドラッグ開始
        const onMouseDown = (event: MouseEvent) => {
            isDraggingRef.current = true
            previousMousePositionRef.current = {
                x: event.clientX,
                y: event.clientY,
            }
        }

        // マウスドラッグ中
        const onMouseMove = (event: MouseEvent) => {
            if (!isDraggingRef.current || isContentMode) return

            const deltaMove = {
                x: event.clientX - previousMousePositionRef.current.x,
                y: event.clientY - previousMousePositionRef.current.y,
            }

            const rotateSpeed = 0.002
            const euler = new THREE.Euler(0, 0, 0, 'YXZ')
            euler.setFromQuaternion(camera.quaternion)

            euler.y -= deltaMove.x * rotateSpeed
            euler.x -= deltaMove.y * rotateSpeed
            euler.x = Math.max(
                -Math.PI * 0.47,
                Math.min(Math.PI * 0.47, euler.x),
            )

            camera.quaternion.setFromEuler(euler)

            previousMousePositionRef.current = {
                x: event.clientX,
                y: event.clientY,
            }
        }

        // マウスドラッグ終了
        const onMouseUp = () => {
            isDraggingRef.current = false
        }

        // タッチ開始
        const onTouchStart = (event: TouchEvent) => {
            if (event.touches.length === 1) {
                touchStartYRef.current = event.touches[0].clientY
                previousTouchPositionRef.current = {
                    x: event.touches[0].clientX,
                    y: event.touches[0].clientY,
                }
            } else if (event.touches.length === 2) {
                const distance = getPinchDistance(event.touches)
                initialPinchDistanceRef.current = distance
            }
        }

        // タッチ移動
        const onTouchMove = (event: TouchEvent) => {
            if (isContentMode) return

            if (event.touches.length === 1) {
                const touch = event.touches[0]
                const deltaMove = {
                    x: touch.clientX - previousTouchPositionRef.current.x,
                    y: touch.clientY - previousTouchPositionRef.current.y,
                }

                const rotateSpeed = 0.002
                const euler = new THREE.Euler(0, 0, 0, 'YXZ')
                euler.setFromQuaternion(camera.quaternion)

                euler.y -= deltaMove.x * rotateSpeed
                euler.x -= deltaMove.y * rotateSpeed
                euler.x = Math.max(
                    -Math.PI * 0.47,
                    Math.min(Math.PI * 0.47, euler.x),
                )

                camera.quaternion.setFromEuler(euler)

                previousTouchPositionRef.current = {
                    x: touch.clientX,
                    y: touch.clientY,
                }
            } else if (
                event.touches.length === 2 &&
                initialPinchDistanceRef.current !== null
            ) {
                event.preventDefault()

                const currentDistance = getPinchDistance(event.touches)
                const initialDistance = initialPinchDistanceRef.current
                const deltaDistance = currentDistance - initialDistance
                const moveSpeed = 0.5 // ピンチの感度調整

                const direction = new THREE.Vector3()
                camera.getWorldDirection(direction)

                const newPosition = camera.position.clone()
                if (deltaDistance < 0) {
                    // ピンチイン (前進)
                    newPosition.sub(direction.multiplyScalar(moveSpeed))
                } else if (deltaDistance > 0) {
                    // ピンチアウト (後退)
                    newPosition.add(direction.multiplyScalar(moveSpeed))
                }

                if (isValidPosition(newPosition)) {
                    camera.position.copy(newPosition)
                }

                initialPinchDistanceRef.current = currentDistance
            }
        }

        // タッチ終了
        const onTouchEnd = (event: TouchEvent) => {
            if (event.touches.length < 2) {
                initialPinchDistanceRef.current = null
            }

            if (event.touches.length === 1) {
                previousTouchPositionRef.current = {
                    x: event.touches[0].clientX,
                    y: event.touches[0].clientY,
                }
                touchStartYRef.current = event.touches[0].clientY
            }

            if (event.touches.length === 0) {
                previousTouchPositionRef.current = { x: 0, y: 0 }
                touchStartYRef.current = 0
                initialPinchDistanceRef.current = null
            }
        }

        // ピンチ距離を計算するヘルパー関数
        const getPinchDistance = (touches: TouchList): number => {
            const dx = touches[0].clientX - touches[1].clientX
            const dy = touches[0].clientY - touches[1].clientY
            return Math.sqrt(dx * dx + dy * dy)
        }

        // イベントリスナーの登録
        window.addEventListener('wheel', onWheel, { passive: false })
        window.addEventListener('mousedown', onMouseDown)
        window.addEventListener('mousemove', onMouseMove)
        window.addEventListener('mouseup', onMouseUp)
        window.addEventListener('touchstart', onTouchStart)
        window.addEventListener('touchmove', onTouchMove, { passive: false })
        window.addEventListener('touchend', onTouchEnd)

        // クリーンアップ
        return () => {
            window.removeEventListener('wheel', onWheel)
            window.removeEventListener('mousedown', onMouseDown)
            window.removeEventListener('mousemove', onMouseMove)
            window.removeEventListener('mouseup', onMouseUp)
            window.removeEventListener('touchstart', onTouchStart)
            window.removeEventListener('touchmove', onTouchMove)
            window.removeEventListener('touchend', onTouchEnd)
        }
    }, [camera, controls, isContentMode])

    return null
}
