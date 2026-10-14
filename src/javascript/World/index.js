import * as THREE from 'three'
import Materials from './Materials.js'
import Floor from './Floor.js'
import Shadows from './Shadows.js'
import Physics from './Physics.js'
import Zones from './Zones.js'
import Objects from './Objects.js'
import Car from './Car.js'
import Areas from './Areas.js'
import Tiles from './Tiles.js'
import Walls from './Walls.js'
import IntroSection from './Sections/IntroSection.js'
import ProjectsSection from './Sections/ProjectsSection.js'
import CrossroadsSection from './Sections/CrossroadsSection.js'
import InformationSection from './Sections/InformationSection.js'
import PlaygroundSection from './Sections/PlaygroundSection.js'
// import DistinctionASection from './Sections/DistinctionASection.js'
// import DistinctionBSection from './Sections/DistinctionBSection.js'
// import DistinctionCSection from './Sections/DistinctionCSection.js'
// import DistinctionDSection from './Sections/DistinctionDSection.js'
import Controls from './Controls.js'
import Sounds from './Sounds.js'
import gsap from 'gsap'
import EasterEggs from './EasterEggs.js'

export default class World
{
    constructor(_options)
    {
        // Options
        this.config = _options.config
        this.debug = _options.debug
        this.resources = _options.resources
        this.time = _options.time
        this.sizes = _options.sizes
        this.camera = _options.camera
        this.scene = _options.scene
        this.renderer = _options.renderer
        this.passes = _options.passes

        // Debug
        if(this.debug)
        {
            this.debugFolder = this.debug.addFolder('world')
            this.debugFolder.open()
        }

        // Set up
        this.container = new THREE.Object3D()
        this.container.matrixAutoUpdate = false

        // this.setAxes()
        this.setSounds()
        this.setControls()
        this.setFloor()
        this.setAreas()
        this.setStartingScreen()
    }

    start()
    {
        window.setTimeout(() =>
        {
            this.camera.pan.enable()
        }, 2000)

        this.setReveal()
        this.setMaterials()
        this.setShadows()
        this.setPhysics()
        this.setZones()
        this.setObjects()
        this.setCar()
        this.areas.car = this.car
        this.setTiles()
        this.setWalls()
        this.setSections()
        this.setEasterEggs()
    }

    setReveal()
    {
        this.reveal = {}
        this.reveal.matcapsProgress = 0
        this.reveal.floorShadowsProgress = 0
        this.reveal.previousMatcapsProgress = null
        this.reveal.previousFloorShadowsProgress = null

        // Go method
        this.reveal.go = () =>
        {
            gsap.fromTo(this.reveal, { matcapsProgress: 0 }, { matcapsProgress: 1, duration: 3 })
            gsap.fromTo(this.reveal, { floorShadowsProgress: 0 }, { floorShadowsProgress: 1, duration: 3, delay: 0.5 })
            gsap.fromTo(this.shadows, { alpha: 0 }, { alpha: 0.5, duration: 3, delay: 0.5 })

            if(this.sections.intro)
            {
                gsap.fromTo(this.sections.intro.instructions.arrows.label.material, { opacity: 0 }, { opacity: 1, duration: 0.3, delay: 0.5 })
                if(this.sections.intro.otherInstructions)
                {
                    gsap.fromTo(this.sections.intro.otherInstructions.label.material, { opacity: 0 }, { opacity: 1, duration: 0.3, delay: 0.75 })
                }
            }

            // Car
            this.physics.car.chassis.body.sleep()
            this.physics.car.chassis.body.position.set(0, 0, 12)

            window.setTimeout(() =>
            {
                this.physics.car.chassis.body.wakeUp()
            }, 300)

            // Sound
            gsap.fromTo(this.sounds.engine.volume, { master: 0 }, { master: 0.7, duration: 0.5, delay: 0.3, ease: 'power2.in' })
            window.setTimeout(() =>
            {
                this.sounds.play('reveal')
            }, 400)

            // Controls
            if(this.controls.touch)
            {
                window.setTimeout(() =>
                {
                    this.controls.touch.reveal()
                }, 400)
            }
        }

        // Time tick
        this.time.on('tick',() =>
        {
            // Matcap progress changed
            if(this.reveal.matcapsProgress !== this.reveal.previousMatcapsProgress)
            {
                // Update each material
                for(const _materialKey in this.materials.shades.items)
                {
                    const material = this.materials.shades.items[_materialKey]
                    material.uniforms.uRevealProgress.value = this.reveal.matcapsProgress
                }

                // Save
                this.reveal.previousMatcapsProgress = this.reveal.matcapsProgress
            }

            // Matcap progress changed
            if(this.reveal.floorShadowsProgress !== this.reveal.previousFloorShadowsProgress)
            {
                // Update each floor shadow
                for(const _mesh of this.objects.floorShadows)
                {
                    _mesh.material.uniforms.uAlpha.value = this.reveal.floorShadowsProgress
                }

                // Save
                this.reveal.previousFloorShadowsProgress = this.reveal.floorShadowsProgress
            }
        })

        // Debug
        if(this.debug)
        {
            this.debugFolder.add(this.reveal, 'matcapsProgress').step(0.0001).min(0).max(1).name('matcapsProgress')
            this.debugFolder.add(this.reveal, 'floorShadowsProgress').step(0.0001).min(0).max(1).name('floorShadowsProgress')
            this.debugFolder.add(this.reveal, 'go').name('reveal')
        }
    }

    setStartingScreen()
    {
        this.startingScreen = {}

        // Area
        this.startingScreen.area = this.areas.add({
            position: new THREE.Vector2(0, 0),
            halfExtents: new THREE.Vector2(2.35, 1.5),
            hasKey: false,
            testCar: false,
            active: false
        })

        // Loading label
        this.startingScreen.loadingLabel = {}
        this.startingScreen.loadingLabel.geometry = new THREE.PlaneGeometry(2.5, 2.5 / 4)
        this.startingScreen.loadingLabel.image = new Image()
        this.startingScreen.loadingLabel.image.src = 'data:image/png;base64,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'
        this.startingScreen.loadingLabel.texture = new THREE.Texture(this.startingScreen.loadingLabel.image)
        this.startingScreen.loadingLabel.texture.magFilter = THREE.NearestFilter
        this.startingScreen.loadingLabel.texture.minFilter = THREE.LinearFilter
        this.startingScreen.loadingLabel.texture.needsUpdate = true
        this.startingScreen.loadingLabel.material = new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, color: 0xffffff, alphaMap: this.startingScreen.loadingLabel.texture })
        this.startingScreen.loadingLabel.mesh = new THREE.Mesh(this.startingScreen.loadingLabel.geometry, this.startingScreen.loadingLabel.material)
        this.startingScreen.loadingLabel.mesh.matrixAutoUpdate = false
        this.container.add(this.startingScreen.loadingLabel.mesh)

        // Start label
        this.startingScreen.startLabel = {}
        this.startingScreen.startLabel.geometry = new THREE.PlaneGeometry(2.5, 2.5 / 4)
        this.startingScreen.startLabel.image = new Image()
        this.startingScreen.startLabel.image.src = 'data:image/png;base64,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'
        this.startingScreen.startLabel.texture = new THREE.Texture(this.startingScreen.startLabel.image)
        this.startingScreen.startLabel.texture.magFilter = THREE.NearestFilter
        this.startingScreen.startLabel.texture.minFilter = THREE.LinearFilter
        this.startingScreen.startLabel.texture.needsUpdate = true
        this.startingScreen.startLabel.material = new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, color: 0xffffff, alphaMap: this.startingScreen.startLabel.texture })
        this.startingScreen.startLabel.material.opacity = 0
        this.startingScreen.startLabel.mesh = new THREE.Mesh(this.startingScreen.startLabel.geometry, this.startingScreen.startLabel.material)
        this.startingScreen.startLabel.mesh.matrixAutoUpdate = false
        this.container.add(this.startingScreen.startLabel.mesh)

        // Progress
        this.resources.on('progress', (_progress) =>
        {
            // Update area
            this.startingScreen.area.floorBorder.material.uniforms.uAlpha.value = 1
            this.startingScreen.area.floorBorder.material.uniforms.uLoadProgress.value = _progress
        })

        // Ready
        this.resources.on('ready', () =>
        {
            window.requestAnimationFrame(() =>
            {
                this.startingScreen.area.activate()

                gsap.to(this.startingScreen.area.floorBorder.material.uniforms.uAlpha, { value: 0.3, duration: 0.3 })
                gsap.to(this.startingScreen.loadingLabel.material, { opacity: 0, duration: 0.3 })
                gsap.to(this.startingScreen.startLabel.material, { opacity: 1, duration: 0.3, delay: 0.3 })
            })
        })

        // On interact, reveal
        this.startingScreen.area.on('interact', () =>
        {
            this.startingScreen.area.deactivate()
            gsap.to(this.startingScreen.area.floorBorder.material.uniforms.uProgress, { value: 0, duration: 0.3, delay: 0.4 })

            gsap.to(this.startingScreen.startLabel.material, { opacity: 0, duration: 0.3, delay: 0.4 })

            this.start()

            window.setTimeout(() =>
            {
                this.reveal.go()
            }, 600)
        })
    }

    setSounds()
    {
        this.sounds = new Sounds({
            debug: this.debugFolder,
            time: this.time
        })
    }

    setAxes()
    {
        this.axis = new THREE.AxesHelper()
        this.container.add(this.axis)
    }

    setControls()
    {
        this.controls = new Controls({
            config: this.config,
            sizes: this.sizes,
            time: this.time,
            camera: this.camera,
            sounds: this.sounds
        })
    }

    setMaterials()
    {
        this.materials = new Materials({
            resources: this.resources,
            debug: this.debugFolder
        })
    }

    setFloor()
    {
        this.floor = new Floor({
            debug: this.debugFolder
        })

        this.container.add(this.floor.container)
    }

    setShadows()
    {
        this.shadows = new Shadows({
            time: this.time,
            debug: this.debugFolder,
            renderer: this.renderer,
            camera: this.camera
        })
        this.container.add(this.shadows.container)
    }

    setPhysics()
    {
        this.physics = new Physics({
            config: this.config,
            debug: this.debug,
            scene: this.scene,
            time: this.time,
            sizes: this.sizes,
            controls: this.controls,
            sounds: this.sounds
        })

        this.container.add(this.physics.models.container)
    }

    setZones()
    {
        this.zones = new Zones({
            time: this.time,
            physics: this.physics,
            debug: this.debugFolder
        })
        this.container.add(this.zones.container)
    }

    setAreas()
    {
        this.areas = new Areas({
            config: this.config,
            resources: this.resources,
            debug: this.debug,
            renderer: this.renderer,
            camera: this.camera,
            car: this.car,
            sounds: this.sounds,
            time: this.time
        })

        this.container.add(this.areas.container)
    }

    setTiles()
    {
        this.tiles = new Tiles({
            resources: this.resources,
            objects: this.objects,
            debug: this.debug
        })
    }

    setWalls()
    {
        this.walls = new Walls({
            resources: this.resources,
            objects: this.objects
        })
    }

    setObjects()
    {
        this.objects = new Objects({
            time: this.time,
            resources: this.resources,
            materials: this.materials,
            physics: this.physics,
            shadows: this.shadows,
            sounds: this.sounds,
            debug: this.debugFolder
        })
        this.container.add(this.objects.container)

        // window.requestAnimationFrame(() =>
        // {
        //     this.objects.merge.update()
        // })
    }

    setCar()
    {
        this.car = new Car({
            time: this.time,
            resources: this.resources,
            objects: this.objects,
            physics: this.physics,
            shadows: this.shadows,
            materials: this.materials,
            controls: this.controls,
            sounds: this.sounds,
            renderer: this.renderer,
            camera: this.camera,
            debug: this.debugFolder,
            config: this.config
        })
        this.container.add(this.car.container)
    }

    setSections()
    {
        this.sections = {}

        // Generic options
        const options = {
            config: this.config,
            time: this.time,
            resources: this.resources,
            camera: this.camera,
            passes: this.passes,
            objects: this.objects,
            areas: this.areas,
            zones: this.zones,
            walls: this.walls,
            tiles: this.tiles,
            debug: this.debugFolder
        }

        // // Distinction A
        // this.sections.distinctionA = new DistinctionASection({
        //     ...options,
        //     x: 0,
        //     y: - 15
        // })
        // this.container.add(this.sections.distinctionA.container)

        // // Distinction B
        // this.sections.distinctionB = new DistinctionBSection({
        //     ...options,
        //     x: 0,
        //     y: - 15
        // })
        // this.container.add(this.sections.distinctionB.container)

        // // Distinction C
        // this.sections.distinctionC = new DistinctionCSection({
        //     ...options,
        //     x: 0,
        //     y: 0
        // })
        // this.container.add(this.sections.distinctionC.container)

        // // Distinction D
        // this.sections.distinctionD = new DistinctionDSection({
        //     ...options,
        //     x: 0,
        //     y: 0
        // })
        // this.container.add(this.sections.distinctionD.container)

        // Intro
        this.sections.intro = new IntroSection({
            ...options,
            x: 0,
            y: 0
        })
        this.container.add(this.sections.intro.container)

        // Crossroads
        this.sections.crossroads = new CrossroadsSection({
            ...options,
            x: 0,
            y: - 30
        })
        this.container.add(this.sections.crossroads.container)

        // Projects
        this.sections.projects = new ProjectsSection({
            ...options,
            x: 30,
            y: - 30
            // x: 0,
            // y: 0
        })
        this.container.add(this.sections.projects.container)

        // Information
        this.sections.information = new InformationSection({
            ...options,
            x: 1.2,
            y: - 55
            // x: 0,
            // y: - 10
        })
        this.container.add(this.sections.information.container)

        // Playground
        this.sections.playground = new PlaygroundSection({
            ...options,
            x: - 38,
            y: - 34
            // x: - 15,
            // y: - 4
        })
        this.container.add(this.sections.playground.container)
    }

    setEasterEggs()
    {
        this.easterEggs = new EasterEggs({
            resources: this.resources,
            car: this.car,
            walls: this.walls,
            objects: this.objects,
            materials: this.materials,
            areas: this.areas,
            config: this.config,
            physics: this.physics
        })
        this.container.add(this.easterEggs.container)
    }
}
