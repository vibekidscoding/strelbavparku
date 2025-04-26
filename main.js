// Importujeme potřebné části z Three.js modulu
import * as THREE from 'three';
// OrbitControls už nepotřebujeme
console.log('[DEBUG] THREE object loaded:', THREE ? 'Yes' : 'No');

// --- Globální proměnné ---
let scene, camera, renderer;
let ground1, ground2;
let railingLeft1, railingRight1, railingLeft2, railingRight2;
const parkObjects = [];
const clock = new THREE.Clock();
let groundWidth;
let groundLength;
let worldSpeed = 5.0;
const worldSpeedIncrease = 0.05;
const maxWorldSpeed = 15.0;


// --- Hráč, střelba a ovládání ---
let player;
const projectiles = [];
const projectileSpeed = 25;
const projectileMaxDistance = 80;
const playerSpeed = 5.0;
const keysPressed = {
    a: false, d: false, space: false
};
const walkCycleSpeed = 15;
const walkAmplitude = Math.PI / 6;
let playerLives = 3;
let isGameOver = false;
let livesDisplayElement;
let gameOverElement;
let score = 0;
let scoreDisplayElement;
let playerInvincible = false;
let playerInvincibilityTimer = 0;
const playerInvincibilityDuration = 1.0;


// --- Nepřátelé ---
const enemies = [];
const enemySpeed = 3.0;
let enemySpawnInterval = 1.5;
const minEnemySpawnInterval = 0.4;
const spawnIntervalDecrease = 0.02;
let enemySpawnTimer = enemySpawnInterval;
const enemyShakeIntensity = 0.02;
const enemySpawnDistance = 70;
const enemyHomingFactor = 3.5;


// --- Exploze ---
const explosions = [];
const explosionParticleCount = 15;
const explosionParticleSpeed = 8.0;
const explosionParticleLifetime = 0.5;

// --- Materiály ---
const groundMaterial = new THREE.MeshToonMaterial({ color: 0x99cc66 });
const treeTrunkMaterial = new THREE.MeshToonMaterial({ color: 0x8B4513 });
const treeLeavesMaterial = new THREE.MeshToonMaterial({ color: 0x228B22 });
const benchMaterial = new THREE.MeshToonMaterial({ color: 0xCD853F });
const trashCanMaterial = new THREE.MeshToonMaterial({ color: 0x696969 });
const playerBodyMaterial = new THREE.MeshToonMaterial({ color: 0xffffff });
const playerGunMaterial = new THREE.MeshToonMaterial({ color: 0xff0000 });
const paperclipMaterial = new THREE.MeshToonMaterial({ color: 0x808080 });
const faceMaterial = new THREE.MeshToonMaterial({ color: 0x333333 });
const enemyMaterial = new THREE.MeshToonMaterial({ color: 0xadd8e6 });
const enemyFaceMaterial = new THREE.MeshToonMaterial({ color: 0x222222 });
const explosionParticleMaterial = new THREE.MeshToonMaterial({
    color: 0xadd8e6,
    transparent: true,
    opacity: 1.0
});
const railingMaterial = new THREE.MeshToonMaterial({ color: 0x778899 });


// --- Funkce pro tvorbu Nepřátel ---
function createEnemy(x, z) { /* ... kód beze změny ... */
    const enemy = new THREE.Group();
    const enemyHeight = 1.2; const enemyRadius = 0.6; const radialSegments = 16; const heightSegments = 8;
    const enemyGeometry = new THREE.CylinderGeometry( enemyRadius, enemyRadius, enemyHeight, radialSegments, heightSegments );
    const posAttr = enemyGeometry.attributes.position; const vert = new THREE.Vector3(); const crumple = 0.20;
    for (let i = 0; i < posAttr.count; i++) { vert.fromBufferAttribute(posAttr, i); if (Math.abs(vert.y) < enemyHeight / 2 * 0.95) { vert.x += (Math.random() - 0.5) * crumple; vert.z += (Math.random() - 0.5) * crumple; vert.y += (Math.random() - 0.5) * crumple * 0.5; } posAttr.setXYZ(i, vert.x, vert.y, vert.z); }
    enemyGeometry.computeVertexNormals();
    const body = new THREE.Mesh(enemyGeometry, enemyMaterial); body.castShadow = true; body.receiveShadow = true; body.name = "enemyBody"; enemy.add(body);
    const enemyEyeRadius = 0.12; const enemyEyeY = enemyHeight * 0.2; const enemyEyeSpacing = enemyRadius * 0.4; const enemyEyeZOffset = enemyRadius * 0.85;
    const leftEyeGeom = new THREE.SphereGeometry(enemyEyeRadius, 8, 8); const leftEyeMesh = new THREE.Mesh(leftEyeGeom, enemyFaceMaterial); leftEyeMesh.position.set(-enemyEyeSpacing, enemyEyeY, enemyEyeZOffset); enemy.add(leftEyeMesh);
    const rightEyeGeom = new THREE.SphereGeometry(enemyEyeRadius, 8, 8); const rightEyeMesh = new THREE.Mesh(rightEyeGeom, enemyFaceMaterial); rightEyeMesh.position.set(enemyEyeSpacing, enemyEyeY, enemyEyeZOffset); enemy.add(rightEyeMesh);
    enemy.position.set(x, enemyHeight / 2, z);
    enemy.userData.boundingBox = new THREE.Box3().setFromObject(enemy);
    enemy.userData.originalY = enemy.position.y;
    scene.add(enemy); enemies.push(enemy); return enemy;
}

// --- Funkce pro tvorbu Exploze ---
function createExplosion(position) { /* ... kód beze změny ... */
    const explosion = new THREE.Group();
    explosion.position.copy(position);
    explosion.userData.particles = [];
    explosion.userData.timeCreated = clock.getElapsedTime();
    const particleGeometry = new THREE.BoxGeometry(0.1, 0.1, 0.1);
    for (let i = 0; i < explosionParticleCount; i++) {
        const particle = new THREE.Mesh(particleGeometry, explosionParticleMaterial.clone());
        const velocity = new THREE.Vector3( (Math.random() - 0.5), (Math.random() - 0.5), (Math.random() - 0.5) ).normalize().multiplyScalar(explosionParticleSpeed);
        particle.userData.velocity = velocity;
        explosion.add(particle);
        explosion.userData.particles.push(particle);
    }
    scene.add(explosion); explosions.push(explosion);
}

// --- Funkce pro tvorbu Zábradlí ---
function createRailing(xPosition, length, height = 0.8, postSpacing = 2.5) { /* ... kód beze změny ... */
    const railing = new THREE.Group();
    const postSize = 0.1; const railHeight = 0.08;
    const railGeometry = new THREE.BoxGeometry(postSize, railHeight, length);
    const topRail = new THREE.Mesh(railGeometry, railingMaterial);
    topRail.position.set(0, height - railHeight / 2, -length / 2);
    topRail.castShadow = true; topRail.receiveShadow = true; railing.add(topRail);
    const postGeometry = new THREE.BoxGeometry(postSize, height, postSize);
    const numPosts = Math.floor(length / postSpacing) + 1;
    for (let i = 0; i < numPosts; i++) {
        const post = new THREE.Mesh(postGeometry, railingMaterial);
        const zPos = -i * postSpacing;
        post.position.set(0, height / 2, zPos);
        post.castShadow = true; post.receiveShadow = true; railing.add(post);
    }
    railing.position.set(xPosition, 0, 0);
    scene.add(railing); return railing;
}


// --- Inicializační funkce ---
function init() {
    console.log('[DEBUG] Initializing scene...');
    livesDisplayElement = document.getElementById('lives-display');
    gameOverElement = document.getElementById('game-over');
    scoreDisplayElement = document.getElementById('score-display');
    updateLivesDisplay();
    updateScoreDisplay();

    // 1. Scéna
    scene = new THREE.Scene(); scene.background = new THREE.Color(0xabcdef);
    scene.fog = new THREE.Fog(0xabcdef, 15, 180);
    // 2. Kamera
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 200);
    camera.position.set(0, 4, 6);
    console.log('[DEBUG] Camera created at initial position:', camera.position);
    // 3. Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true }); renderer.setSize(window.innerWidth, window.innerHeight); renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; document.body.appendChild(renderer.domElement); console.log('[DEBUG] Renderer created.');
    // --- Osvětlení ---
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6); scene.add(ambientLight); const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0); directionalLight.position.set(5, 10, 7.5); directionalLight.castShadow = true; directionalLight.shadow.mapSize.width = 1024; directionalLight.shadow.mapSize.height = 1024; directionalLight.shadow.camera.near = 0.5; directionalLight.shadow.camera.far = 50; scene.add(directionalLight); scene.add(directionalLight.target);

    // --- Objekty Parku ---
    groundWidth = 40;
    groundLength = 100;
    const groundGeometry = new THREE.PlaneGeometry(groundWidth, groundLength);
    ground1 = new THREE.Mesh(groundGeometry, groundMaterial);
    ground1.rotation.x = -Math.PI / 2; ground1.position.y = 0;
    ground1.position.z = -groundLength / 2 + 5;
    ground1.receiveShadow = true; scene.add(ground1);
    ground2 = new THREE.Mesh(groundGeometry, groundMaterial);
    ground2.rotation.x = -Math.PI / 2; ground2.position.y = 0;
    ground2.position.z = ground1.position.z - groundLength;
    ground2.receiveShadow = true; scene.add(ground2);

    // --- Vytvoření Zábradlí ---
    const railingOffset = groundWidth / 2 - 0.5;
    railingLeft1 = createRailing(-railingOffset, groundLength);
    railingRight1 = createRailing(railingOffset, groundLength);
    railingLeft1.position.z = ground1.position.z + groundLength / 2;
    railingRight1.position.z = ground1.position.z + groundLength / 2;
    railingLeft2 = createRailing(-railingOffset, groundLength);
    railingRight2 = createRailing(railingOffset, groundLength);
    railingLeft2.position.z = ground2.position.z + groundLength / 2;
    railingRight2.position.z = ground2.position.z + groundLength / 2;

    // --- Funkce pro tvorbu objektů parku ---
     function createTree(x, z) { /* ... kód beze změny ... */
        const tree = new THREE.Group();
        const trunkHeight = 1.5;
        const trunkGeometry = new THREE.CylinderGeometry(0.2, 0.3, trunkHeight, 8);
        const trunk = new THREE.Mesh(trunkGeometry, treeTrunkMaterial);
        trunk.position.y = trunkHeight / 2;
        trunk.castShadow = true; tree.add(trunk);
        const leavesHeight = 2;
        const leavesGeometry = new THREE.IcosahedronGeometry(1, 0);
        const leaves = new THREE.Mesh(leavesGeometry, treeLeavesMaterial);
        leaves.position.y = trunkHeight + leavesHeight / 2 - 0.5;
        leaves.castShadow = true; tree.add(leaves);
        tree.position.set(x, 0, z);
        tree.userData.type = 'parkObject';
        tree.userData.boundingBox = new THREE.Box3().setFromObject(tree);
        scene.add(tree); parkObjects.push(tree); return tree;
     }
    function createBench(x, z, rotationY = 0) { /* ... kód beze změny ... */
        const bench = new THREE.Group();
        const seatWidth = 1.5, seatDepth = 0.4, seatHeight = 0.1, legHeight = 0.4, legSize = 0.1;
        const seatGeometry = new THREE.BoxGeometry(seatWidth, seatHeight, seatDepth);
        const seat = new THREE.Mesh(seatGeometry, benchMaterial);
        seat.position.y = legHeight + seatHeight / 2;
        seat.castShadow = true; seat.receiveShadow = true; bench.add(seat);
        const legGeometry = new THREE.BoxGeometry(legSize, legHeight, legSize);
        const legPositions = [ { x: seatWidth / 2 - legSize / 2, z: seatDepth / 2 - legSize / 2 }, { x: -seatWidth / 2 + legSize / 2, z: seatDepth / 2 - legSize / 2 }, { x: seatWidth / 2 - legSize / 2, z: -seatDepth / 2 + legSize / 2 }, { x: -seatWidth / 2 + legSize / 2, z: -seatDepth / 2 + legSize / 2 }, ];
        legPositions.forEach(pos => { const leg = new THREE.Mesh(legGeometry, benchMaterial); leg.position.set(pos.x, legHeight / 2, pos.z); leg.castShadow = true; leg.receiveShadow = true; bench.add(leg); });
        bench.position.set(x, 0, z); bench.rotation.y = rotationY;
        bench.userData.type = 'parkObject';
        bench.userData.boundingBox = new THREE.Box3().setFromObject(bench);
        scene.add(bench); parkObjects.push(bench); return bench;
     }
     function createTrashCan(x, z) { /* ... kód beze změny ... */
        const canHeight = 0.8, canRadius = 0.3;
        const trashCanGeometry = new THREE.CylinderGeometry(canRadius, canRadius * 0.8, canHeight, 16);
        const trashCan = new THREE.Mesh(trashCanGeometry, trashCanMaterial);
        trashCan.position.set(x, canHeight / 2, z);
        trashCan.castShadow = true; trashCan.receiveShadow = true;
        trashCan.userData.type = 'parkObject';
        trashCan.userData.boundingBox = new THREE.Box3().setFromObject(trashCan);
        scene.add(trashCan); parkObjects.push(trashCan); return trashCan;
     }
    // --- Rozmístění Počátečních Objektů Parku ---
    const initialZOffset = -groundLength / 2 + 15;
    createTree(-15, initialZOffset - 10); createTree(10, initialZOffset - 20); createTree(-8, initialZOffset - 35);
    createTree(12, initialZOffset - 50); createTree(5, initialZOffset - 65); createTree(-18, initialZOffset - 80);
    createBench(8, initialZOffset - 15); createBench(-12, initialZOffset - 45, Math.PI / 8); createBench(15, initialZOffset - 75, -Math.PI / 16);
    createTrashCan(-5, initialZOffset - 5); createTrashCan(16, initialZOffset - 40); createTrashCan(-10, initialZOffset - 70);

    // --- Vytvoření Hráče ---
    function createPlayer() { /* ... kód beze změny ... */
        console.log('[DEBUG] Creating updated player model...');
        player = new THREE.Group();
        const bodyWidth = 0.5; const bodyHeight = 1.0; const bodyDepth = 0.2;
        const bodySegments = 6;
        const bodyGeometry = new THREE.BoxGeometry( bodyWidth, bodyHeight, bodyDepth, bodySegments, bodySegments, bodySegments );
        const positionAttribute = bodyGeometry.attributes.position; const vertex = new THREE.Vector3(); const crumpleFactor = 0.05;
        for (let i = 0; i < positionAttribute.count; i++) { vertex.fromBufferAttribute(positionAttribute, i); vertex.x += (Math.random() - 0.5) * crumpleFactor; vertex.y += (Math.random() - 0.5) * crumpleFactor; vertex.z += (Math.random() - 0.5) * crumpleFactor; positionAttribute.setXYZ(i, vertex.x, vertex.y, vertex.z); }
        bodyGeometry.computeVertexNormals(); const body = new THREE.Mesh(bodyGeometry, playerBodyMaterial); body.castShadow = true; body.rotation.x = (Math.random() - 0.5) * 0.15; body.rotation.y = (Math.random() - 0.5) * 0.15; player.add(body);
        const faceZOffset = bodyDepth / 2 + 0.01; const eyeRadius = 0.05; const eyeY = bodyHeight * 0.25; const eyeXSpacing = bodyWidth * 0.25; const leftEyeGeometry = new THREE.SphereGeometry(eyeRadius, 8, 8); const leftEye = new THREE.Mesh(leftEyeGeometry, faceMaterial); leftEye.position.set(-eyeXSpacing, eyeY, faceZOffset); player.add(leftEye); const rightEyeGeometry = new THREE.SphereGeometry(eyeRadius, 8, 8); const rightEye = new THREE.Mesh(rightEyeGeometry, faceMaterial); rightEye.position.set(eyeXSpacing, eyeY, faceZOffset); player.add(rightEye); const mouthWidth = bodyWidth * 0.4; const mouthHeight = 0.03; const mouthY = bodyHeight * 0.05; const mouthGeometry = new THREE.BoxGeometry(mouthWidth, mouthHeight, 0.02); const mouth = new THREE.Mesh(mouthGeometry, faceMaterial); mouth.position.set(0, mouthY, faceZOffset); mouth.rotation.z = -Math.PI / 16; player.add(mouth);
        const gunLength = 0.5, gunHeight = 0.2, gunWidth = 0.15; const gunGeometry = new THREE.BoxGeometry(gunLength, gunHeight, gunWidth); const gun = new THREE.Mesh(gunGeometry, playerGunMaterial); gun.position.set(bodyWidth / 2 + gunLength / 2 - 0.05, 0, bodyDepth / 2 + 0.05); gun.castShadow = true; player.add(gun);
        const legWidth = 0.15, legHeight = 0.4, legDepth = 0.15; const legGeometry = new THREE.BoxGeometry(legWidth, legHeight, legDepth); const leftLeg = new THREE.Mesh(legGeometry, playerBodyMaterial); const legYOffset = -bodyHeight / 2 - legHeight / 2; leftLeg.position.set(-bodyWidth / 3, legYOffset, 0); leftLeg.castShadow = true; player.add(leftLeg); const rightLeg = new THREE.Mesh(legGeometry, playerBodyMaterial); rightLeg.position.set(bodyWidth / 3, legYOffset, 0); rightLeg.castShadow = true; player.add(rightLeg);
        player.userData.leftLeg = leftLeg; player.userData.rightLeg = rightLeg; player.userData.legYOffset = legYOffset;
        player.userData.boundingBox = new THREE.Box3().setFromObject(player);
        const playerYPosition = bodyHeight / 2 + legHeight;
        player.position.set(0, playerYPosition, 0);
        scene.add(player); console.log('[DEBUG] Updated Player model created and added to scene at:', player.position);
        camera.lookAt(player.position);
     }
    createPlayer();
    // --- Funkce pro střelbu ---
    function shootPaperclip() { /* ... kód beze změny ... */
        if (!player || isGameOver) return;
        const clipRadius = 0.02, clipLength = 0.2;
        const clipGeometry = new THREE.CylinderGeometry(clipRadius, clipRadius, clipLength, 6);
        const paperclip = new THREE.Mesh(clipGeometry, paperclipMaterial);
        paperclip.rotation.x = Math.PI / 2;
        const gun = player.children.find(child => child.material === playerGunMaterial);
        if (!gun) { console.error("Gun mesh not found on player!"); return; }
        const gunPosition = new THREE.Vector3();
        gun.getWorldPosition(gunPosition);
        const offset = new THREE.Vector3(0, 0, -0.3);
        offset.applyQuaternion(player.quaternion);
        paperclip.position.copy(gunPosition).add(offset);
        paperclip.userData.velocity = new THREE.Vector3(0, 0, -1);
        paperclip.userData.velocity.applyQuaternion(player.quaternion).multiplyScalar(projectileSpeed);
        paperclip.userData.distanceTraveled = 0;
        paperclip.userData.boundingBox = new THREE.Box3().setFromObject(paperclip);
        scene.add(paperclip);
        projectiles.push(paperclip);
     }
    // --- Ovládání Klávesnicí ---
    function handleKeyDown(event) {
        if (isGameOver) return;
        switch (event.code) {
            case 'KeyA': keysPressed.a = true; break;
            case 'KeyD': keysPressed.d = true; break;
            case 'Space': if (!keysPressed.space) { shootPaperclip(); keysPressed.space = true; } break;
        }
     }
    function handleKeyUp(event) {
         switch (event.code) {
            case 'KeyA': keysPressed.a = false; break;
            case 'KeyD': keysPressed.d = false; break;
            case 'Space': keysPressed.space = false; break;
        }
     }
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // --- Ovládání Dotykem ---
    const btnLeft = document.getElementById('btn-left');
    const btnRight = document.getElementById('btn-right');
    const btnShoot = document.getElementById('btn-shoot');

    if (btnLeft && btnRight && btnShoot) {
        // Pohyb doleva
        btnLeft.addEventListener('touchstart', (e) => { e.preventDefault(); if (!isGameOver) keysPressed.a = true; }, { passive: false });
        btnLeft.addEventListener('touchend', (e) => { e.preventDefault(); keysPressed.a = false; });
        // Pohyb doprava
        btnRight.addEventListener('touchstart', (e) => { e.preventDefault(); if (!isGameOver) keysPressed.d = true; }, { passive: false });
        btnRight.addEventListener('touchend', (e) => { e.preventDefault(); keysPressed.d = false; });
        // Střelba
        btnShoot.addEventListener('touchstart', (e) => { e.preventDefault(); if (!isGameOver && !keysPressed.space) { shootPaperclip(); keysPressed.space = true; } }, { passive: false });
        btnShoot.addEventListener('touchend', (e) => { e.preventDefault(); keysPressed.space = false; });

        // Zabráníme dvojitému kliknutí/zoomu na mobilu při rychlém tapnutí
        document.getElementById('touch-controls').addEventListener('touchstart', (e) => e.preventDefault(), { passive: false });

    } else {
        console.error("Touch control buttons not found!");
    }


    // --- Responzivita ---
    window.addEventListener('resize', onWindowResize, false);
    // --- Start Animace ---
    console.log('[DEBUG] Starting animation loop...'); animate();
}

// --- Funkce pro aktualizaci zobrazení životů ---
function updateLivesDisplay() { /* ... kód beze změny ... */
    if (livesDisplayElement) { livesDisplayElement.innerHTML = '❤️'.repeat(Math.max(0, playerLives)); }
 }

 // --- Funkce pro aktualizaci zobrazení skóre ---
 function updateScoreDisplay() {
    if (scoreDisplayElement) {
        scoreDisplayElement.textContent = `Skóre: ${score}`;
    }
 }

// --- Funkce volaná při změně velikosti okna ---
function onWindowResize() { /* ... kód beze změny ... */
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
 }

// --- Animační Smyčka ---
function animate() {
    requestAnimationFrame(animate);
    if (isGameOver) { renderer.render(scene, camera); return; }

    const deltaTime = clock.getDelta(); const elapsedTime = clock.getElapsedTime();

    // --- Zrychlování hry ---
    if (worldSpeed < maxWorldSpeed) { worldSpeed += worldSpeedIncrease * deltaTime; }
    // --- Zvyšování počtu nepřátel ---
    if (enemySpawnInterval > minEnemySpawnInterval) { enemySpawnInterval -= spawnIntervalDecrease * deltaTime; }

    const worldMoveDistance = worldSpeed * deltaTime;

    // --- Pohyb Světa ---
    ground1.position.z += worldMoveDistance;
    ground2.position.z += worldMoveDistance;
    railingLeft1.position.z += worldMoveDistance;
    railingRight1.position.z += worldMoveDistance;
    railingLeft2.position.z += worldMoveDistance;
    railingRight2.position.z += worldMoveDistance;
    parkObjects.forEach(obj => { obj.position.z += worldMoveDistance; });

    // --- Recyklace Země ---
    if (ground1.position.z > camera.position.z + groundLength / 2) {
        ground1.position.z = ground2.position.z - groundLength;
    }
    if (ground2.position.z > camera.position.z + groundLength / 2) {
        ground2.position.z = ground1.position.z - groundLength;
    }

    // --- Recyklace Zábradlí ---
    if (railingLeft1.position.z > camera.position.z + groundLength / 2) {
        railingLeft1.position.z = railingLeft2.position.z - groundLength;
        railingRight1.position.z = railingRight2.position.z - groundLength;
    }
    if (railingLeft2.position.z > camera.position.z + groundLength / 2) {
        railingLeft2.position.z = railingLeft1.position.z - groundLength;
        railingRight2.position.z = railingRight1.position.z - groundLength;
    }

    // --- Recyklace Parkových Objektů a Kolize s Hráčem ---
    const recycleZ = camera.position.z + 20;
    const placeZ = camera.position.z - 80 - groundLength;
    parkObjects.forEach(obj => {
        obj.userData.boundingBox.setFromObject(obj);

        if (player && !playerInvincible && player.userData.boundingBox.intersectsBox(obj.userData.boundingBox)) {
            console.log('[DEBUG] Player hit by park object!');
            playerLives--;
            updateLivesDisplay();
            playerInvincible = true;
            playerInvincibilityTimer = playerInvincibilityDuration;
            if (playerLives <= 0) { console.log('[DEBUG] Game Over!'); isGameOver = true; gameOverElement.style.display = 'block'; }
        }

        if (obj.position.z > recycleZ) {
            obj.position.z = placeZ - Math.random() * 20;
            obj.position.x = (Math.random() - 0.5) * (groundWidth - 4);
        }
    });


    // --- Spawnování Nepřátel ---
    enemySpawnTimer -= deltaTime;
    if (enemySpawnTimer <= 0) {
        const spawnXRange = groundWidth - 2.0;
        const spawnX = (Math.random() - 0.5) * spawnXRange;
        const spawnZ = camera.position.z - enemySpawnDistance;
        createEnemy(spawnX, spawnZ);
        enemySpawnTimer = enemySpawnInterval * (0.8 + Math.random() * 0.4);
    }

    // --- Pohyb Hráče (pouze X) a Animace Nohou ---
    let isMoving = false;
    if (player) {
        const moveXDistance = playerSpeed * deltaTime;
        let moveX = 0;
        if (keysPressed.a) { moveX -= moveXDistance; isMoving = true; }
        if (keysPressed.d) { moveX += moveXDistance; isMoving = true; }
        if (moveX !== 0) {
             player.position.x += moveX;
             const boundaryX = groundWidth / 2 - 1.0;
             player.position.x = Math.max(-boundaryX, Math.min(boundaryX, player.position.x));
        }
         // --- Fixní Kamera Sleduje Hráče ---
         camera.position.x = THREE.MathUtils.lerp(camera.position.x, player.position.x, 0.1);
         camera.lookAt(player.position.x, player.position.y, player.position.z);
         // --- Konec Fixní Kamera ---

        player.userData.boundingBox.setFromObject(player);

        // --- Stálá Animace Nohou ---
        if (player.userData.leftLeg && player.userData.rightLeg) {
            const angle = Math.sin(elapsedTime * walkCycleSpeed) * walkAmplitude;
            player.userData.leftLeg.rotation.x = angle;
            player.userData.rightLeg.rotation.x = -angle;
        }
        // --- Konec Stálé Animace Nohou ---


        // --- Aktualizace nesmrtelnosti hráče ---
        if (playerInvincible) {
            playerInvincibilityTimer -= deltaTime;
            player.visible = Math.floor(elapsedTime * 10) % 2 === 0;
            if (playerInvincibilityTimer <= 0) {
                playerInvincible = false;
                player.visible = true;
            }
        } else {
             player.visible = true;
        }
        // --- Konec Aktualizace nesmrtelnosti ---
    }

    // --- Pohyb Nepřátel, Chvění, Navádění, Úklid a Kolize s Hráčem ---
    for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];
        let moveZ = (enemySpeed + worldSpeed) * deltaTime; let moveX = 0;
        if (player) { const directionToPlayerX = player.position.x - enemy.position.x; moveX = Math.sign(directionToPlayerX) * enemyHomingFactor * deltaTime; const maxSteerSpeed = 2.5 * deltaTime; moveX = THREE.MathUtils.clamp(moveX, -maxSteerSpeed, maxSteerSpeed); } // Mírně zvýšen maxSteerSpeed
        enemy.position.x += moveX; enemy.position.z += moveZ;
        const shakeOffset = Math.sin(elapsedTime * 20 + i * 0.5) * enemyShakeIntensity; enemy.position.y = enemy.userData.originalY + shakeOffset;
        enemy.userData.boundingBox.setFromObject(enemy);
        if (enemy.position.z > camera.position.z + 15) { scene.remove(enemy); enemies.splice(i, 1); continue; }
        if (player && !playerInvincible && player.userData.boundingBox.intersectsBox(enemy.userData.boundingBox)) {
            console.log('[DEBUG] Player hit by enemy!'); playerLives--;
            updateLivesDisplay();
            createExplosion(enemy.position);
            scene.remove(enemy); enemies.splice(i, 1);
            playerInvincible = true;
            playerInvincibilityTimer = playerInvincibilityDuration;
            if (playerLives <= 0) { console.log('[DEBUG] Game Over!'); isGameOver = true; gameOverElement.style.display = 'block'; }
            continue;
        }
    }
    // --- Aktualizace Projektilů a Kolize s Nepřáteli ---
    for (let i = projectiles.length - 1; i >= 0; i--) {
        const projectile = projectiles[i];
        projectile.position.addScaledVector(projectile.userData.velocity, deltaTime); projectile.position.z += worldSpeed * deltaTime;
        projectile.userData.distanceTraveled += projectile.userData.velocity.length() * deltaTime; projectile.userData.boundingBox.setFromObject(projectile);
        let projectileRemoved = false;
        if (projectile.userData.distanceTraveled > projectileMaxDistance || projectile.position.z > camera.position.z + 10) { scene.remove(projectile); projectiles.splice(i, 1); projectileRemoved = true; continue; }
        for (let j = enemies.length - 1; j >= 0; j--) {
             if (!enemies[j]) continue; const enemy = enemies[j];
             if (projectile.userData.boundingBox.intersectsBox(enemy.userData.boundingBox)) {
                createExplosion(enemy.position);
                scene.remove(projectile); projectiles.splice(i, 1); projectileRemoved = true;
                // Přičtení skóre
                score += 10;
                updateScoreDisplay(); // Aktualizace zobrazení skóre
                scene.remove(enemy); enemies.splice(j, 1);
                break;
             }
        }
    }
    // --- Aktualizace Explozí ---
    const currentTime = clock.getElapsedTime();
    for (let i = explosions.length - 1; i >= 0; i--) {
        const explosion = explosions[i];
        explosion.position.z += worldSpeed * deltaTime;
        const timeSinceCreated = currentTime - explosion.userData.timeCreated;
        if (timeSinceCreated > explosionParticleLifetime) { scene.remove(explosion); explosions.splice(i, 1); continue; }
        const fadeFactor = 1.0 - (timeSinceCreated / explosionParticleLifetime);
        explosion.userData.particles.forEach(particle => {
            particle.position.addScaledVector(particle.userData.velocity, deltaTime);
            if (particle.material.opacity !== undefined) { particle.material.opacity = fadeFactor; }
        });
    }
    // --- Vykreslení scény ---
    try { renderer.render(scene, camera); } catch (error) { console.error('[DEBUG] Error during rendering:', error); isGameOver = true; return; }
}

// --- Spuštění ---
window.addEventListener('DOMContentLoaded', () => {
    console.log('[DEBUG] DOM Content Loaded. Running init().');
    init();
});
