﻿import { Pass } from "postprocessing"
import {
	Color,
	DataTexture,
	FloatType,
	Matrix4,
	NearestFilter,
	Quaternion,
	RGBAFormat,
	Vector3,
	VideoTexture,
	WebGLRenderTarget
} from "three"
import { getVisibleChildren } from "../../utils/Utils.js"
import { VelocityMaterial } from "../material/VelocityMaterial.js"

const backgroundColor = new Color(0)
const updateProperties = ["visible", "wireframe", "side"]

export class VelocityPass extends Pass {
	cachedMaterials = new WeakMap()
	lastCameraTransform = {
		position: new Vector3(),
		quaternion: new Quaternion()
	}
	visibleMeshes = []

	constructor(scene, camera) {
		super("VelocityPass")

		this._scene = scene
		this._camera = camera

		this.renderTarget = new WebGLRenderTarget(1, 1, {
			minFilter: NearestFilter,
			magFilter: NearestFilter,
			type: FloatType
		})
	}

	setVelocityMaterialInScene() {
		this.renderedMeshesThisFrame = 0

		this.visibleMeshes = getVisibleChildren(this._scene)

		for (const c of this.visibleMeshes) {
			const originalMaterial = c.material

			let [cachedOriginalMaterial, velocityMaterial] = this.cachedMaterials.get(c) || []

			if (originalMaterial !== cachedOriginalMaterial) {
				velocityMaterial = new VelocityMaterial()
				velocityMaterial.lastMatrixWorld = new Matrix4()

				c.material = velocityMaterial

				if (c.skeleton?.boneTexture) this.saveBoneTexture(c)

				this.cachedMaterials.set(c, [originalMaterial, velocityMaterial])
			}

			velocityMaterial.uniforms.velocityMatrix.value.multiplyMatrices(this._camera.projectionMatrix, c.modelViewMatrix)

			if (c.userData.needsUpdatedReflections || originalMaterial.map instanceof VideoTexture) {
				if (!("FULL_MOVEMENT" in velocityMaterial.defines)) velocityMaterial.needsUpdate = true
				velocityMaterial.defines.FULL_MOVEMENT = ""
			} else {
				if ("FULL_MOVEMENT" in velocityMaterial.defines) {
					delete velocityMaterial.defines.FULL_MOVEMENT
					velocityMaterial.needsUpdate = true
				}
			}

			c.material = velocityMaterial

			for (const prop of updateProperties) velocityMaterial[prop] = originalMaterial[prop]

			if (c.skeleton?.boneTexture) {
				velocityMaterial.defines.USE_SKINNING = ""
				velocityMaterial.defines.BONE_TEXTURE = ""

				velocityMaterial.uniforms.boneTexture.value = c.skeleton.boneTexture
			}
		}
	}

	saveBoneTexture(object) {
		let boneTexture = object.material.uniforms.prevBoneTexture.value

		if (boneTexture && boneTexture.image.width === object.skeleton.boneTexture.width) {
			boneTexture = object.material.uniforms.prevBoneTexture.value
			boneTexture.image.data.set(object.skeleton.boneTexture.image.data)
		} else {
			boneTexture?.dispose()

			const boneMatrices = object.skeleton.boneTexture.image.data.slice()
			const size = object.skeleton.boneTexture.image.width

			boneTexture = new DataTexture(boneMatrices, size, size, RGBAFormat, FloatType)
			object.material.uniforms.prevBoneTexture.value = boneTexture

			boneTexture.needsUpdate = true
		}
	}

	unsetVelocityMaterialInScene() {
		for (const c of this.visibleMeshes) {
			if (c.material.isVelocityMaterial) {
				c.material.lastMatrixWorld.copy(c.matrixWorld)
				c.material.uniforms.prevVelocityMatrix.value.multiplyMatrices(this._camera.projectionMatrix, c.modelViewMatrix)

				if (c.skeleton?.boneTexture) this.saveBoneTexture(c)

				c.material = this.cachedMaterials.get(c)[0]
			}
		}
	}

	setSize(width, height) {
		this.renderTarget.setSize(width, height)
	}

	renderVelocity(renderer) {
		renderer.setRenderTarget(this.renderTarget)

		const { background } = this._scene

		this._scene.background = backgroundColor

		renderer.render(this._scene, this._camera)

		this._scene.background = background
	}

	render(renderer) {
		this.setVelocityMaterialInScene()

		this.renderVelocity(renderer)

		this.unsetVelocityMaterialInScene()
	}
}