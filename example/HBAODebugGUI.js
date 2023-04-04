import { Pane } from "tweakpane"
import copy from "copy-to-clipboard"
import { HBAOEffect } from "../src/hbao/HBAOEffect"

export class HBAODebugGUI {
	constructor(hbaoEffect, params = HBAOEffect.DefaultOptions) {
		const pane = new Pane()
		this.pane = pane
		pane.containerElem_.style.userSelect = "none"
		pane.containerElem_.style.width = "380px"

		pane.on("change", ev => {
			const { presetKey } = ev

			hbaoEffect[presetKey] = ev.value
		})

		params = { ...HBAOEffect.DefaultOptions, ...params }

		const generalFolder = pane.addFolder({ title: "General" })
		generalFolder.addInput(params, "spp", { min: 1, max: 64, step: 1 })
		generalFolder.addInput(params, "distance", { min: 0.1, max: 10, step: 0.01 })
		generalFolder.addInput(params, "distancePower", { min: 1, max: 20, step: 0.25 })
		generalFolder.addInput(params, "bias", {
			min: 0,
			max: 20,
			step: 0.1
		})
		generalFolder.addInput(params, "power", { min: 0.5, max: 64, step: 0.5 })
		generalFolder.addInput(params, "thickness", { min: 0, max: 0.1, step: 0.001 })

		const denoiseFolder = pane.addFolder({ title: "Denoise" })
		denoiseFolder.addInput(params, "denoise", {
			min: 0,
			max: 5,
			step: 0.01
		})
		denoiseFolder.addInput(params, "denoiseIterations", { min: 0, max: 5, step: 1 })
		denoiseFolder.addInput(params, "denoiseKernel", { min: 1, max: 5, step: 1 })
		denoiseFolder.addInput(params, "depthPhi", {
			min: 0,
			max: 50,
			step: 0.001
		})

		pane
			.addButton({
				title: "Copy to Clipboard"
			})
			.on("click", () => {
				const json = {}

				for (const prop of Object.keys(HBAOEffect.DefaultOptions)) {
					json[prop] = hbaoEffect[prop]
				}

				const output = JSON.stringify(json, null, 2)
				copy(output)
			})
	}
}