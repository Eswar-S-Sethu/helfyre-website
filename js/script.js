document.addEventListener("DOMContentLoaded", () => {
    const canvas = document.getElementById('curlCanvas');
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 1); // Black background

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 100;

    // Particle properties
    const particleCount = 10000; // Curl noise emitter
    const perlinParticleCount = 10000; // Perlin noise emitter

    const totalParticleCount = particleCount + perlinParticleCount;

    const particleGeometry = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(totalParticleCount * 3);
    const particleVelocities = new Float32Array(totalParticleCount * 3);
    const particleTypes = new Float32Array(totalParticleCount); // 0 for Curl, 1 for Perlin

    // Initialize particles for both emitters
    for (let i = 0; i < totalParticleCount; i++) {
        // Start at the center
        particlePositions[i * 3] = 0;
        particlePositions[i * 3 + 1] = 0;
        particlePositions[i * 3 + 2] = 0;

        // Random velocities
        const angle1 = Math.random() * Math.PI * 2; // Angle around Y-axis
        const angle2 = Math.random() * Math.PI; // Angle from Z-axis
        const speed = (i < particleCount) ? Math.random() * 0.2 : Math.random() * 0.8; // Higher speed for Perlin emitter

        particleVelocities[i * 3] = speed * Math.sin(angle2) * Math.cos(angle1); // x velocity
        particleVelocities[i * 3 + 1] = speed * Math.sin(angle2) * Math.sin(angle1); // y velocity
        particleVelocities[i * 3 + 2] = speed * Math.cos(angle2); // z velocity

        // Assign particle types: 0 for Curl, 1 for Perlin
        particleTypes[i] = i < particleCount ? 0 : 1;
    }

    particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    particleGeometry.setAttribute('velocity', new THREE.BufferAttribute(particleVelocities, 3));
    particleGeometry.setAttribute('type', new THREE.BufferAttribute(particleTypes, 1));

    // Shader material with both Curl and Perlin noise
    const particleMaterial = new THREE.ShaderMaterial({
        uniforms: {
            time: { value: 0.0 },
        },
        vertexShader: `
            attribute vec3 velocity;
            attribute float type; // 0 for Curl, 1 for Perlin
            uniform float time;
            varying float vGlow;

            // Curl noise
            vec3 curlNoise(vec3 p) {
                float n1 = sin(p.y * 2.0 + time) * 0.1;
                float n2 = cos(p.x * 2.0 + time) * 0.1;
                return vec3(n1, n2, 0.0);
            }

            // Perlin noise
            vec3 perlinNoise(vec3 p) {
                float n1 = sin(p.x * 3.0 + time * 0.5) * 0.2;
                float n2 = cos(p.y * 3.0 + time * 0.5) * 0.2;
                float n3 = sin(p.z * 3.0 + time * 0.5) * 0.2;
                return vec3(n1, n2, n3);
            }

            void main() {
                vec3 noise = (type == 0.0) ? curlNoise(position) : perlinNoise(position);
                vec3 pos = position + noise * 0.5;
                vGlow = abs(sin(time + length(position) * 0.1)); // Glow pattern

                // Reduce particle size
                gl_PointSize = (type == 0.0) ? 3.0 : 2.0; // Smaller for both emitters, Perlin emitter even smaller
                gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
            }
        `,

        fragmentShader: `
            varying float vGlow;

            void main() {
                float dist = length(gl_PointCoord - vec2(0.5));
                if (dist > 0.5) discard; // Circular particles
                vec3 color = mix(vec3(1.0, 0.2, 0.0), vec3(1.0, 0.7, 0.0), vGlow); // Reddish-yellow gradient
                gl_FragColor = vec4(color * vGlow, 1.0); // Glow intensity affects color
            }
        `,
        transparent: true,
    });

    const particleSystem = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(particleSystem);

    // Animation loop
    const animate = () => {
        const positions = particleGeometry.attributes.position.array;
        const velocities = particleGeometry.attributes.velocity.array;

        // Update particle positions based on velocities
        for (let i = 0; i < totalParticleCount; i++) {
            const idx = i * 3;

            positions[idx] += velocities[idx]; // x
            positions[idx + 1] += velocities[idx + 1]; // y
            positions[idx + 2] += velocities[idx + 2]; // z

            // Reset particles if they leave the screen bounds
            if (Math.abs(positions[idx]) > 200 || Math.abs(positions[idx + 1]) > 200 || Math.abs(positions[idx + 2]) > 200) {
                positions[idx] = 0;
                positions[idx + 1] = 0;
                positions[idx + 2] = 0;

                const angle1 = Math.random() * Math.PI * 2;
                const angle2 = Math.random() * Math.PI;
                const speed = Math.random() * 0.2;

                velocities[idx] = speed * Math.sin(angle2) * Math.cos(angle1);
                velocities[idx + 1] = speed * Math.sin(angle2) * Math.sin(angle1);
                velocities[idx + 2] = speed * Math.cos(angle2);
            }
        }

        particleGeometry.attributes.position.needsUpdate = true;

        particleMaterial.uniforms.time.value += 0.01;
        renderer.render(scene, camera);
        requestAnimationFrame(animate);
    };

    animate();

    // Handle window resize
    window.addEventListener('resize', () => {
        renderer.setSize(window.innerWidth, window.innerHeight);
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
    });
});

document.getElementById("subscribeForm").addEventListener("submit", async function (e) {
    e.preventDefault();
    const email = document.getElementById("email").value;

    try {
        const response = await fetch("http://192.168.1.118:5000/subscribe", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ email }),
        });

        if (response.ok) {
            alert("Subscription successful!");
        } else {
            const error = await response.json();
            alert("Error: " + error.error);
        }
    } catch (err) {
        alert("Failed to connect to the subscription service.");
    }
});