// Global sınıf tanımı
window.PokerTable3D = class PokerTable3D {
    constructor(container) {
        if (!window.THREE) {
            console.error('Three.js is not loaded!');
            return;
        }

        this.container = container;
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x1a1a1a); // Koyu arka plan
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.controls = null;
        this.chairs = [];
        this.roomId = '';
        this.activeChairs = 0;
        
        this.init();
    }

    init() {
        try {
            // Renderer ayarları
            this.renderer.setSize(window.innerWidth, window.innerHeight);
            this.renderer.shadowMap.enabled = true;
            this.container.appendChild(this.renderer.domElement);

            // Kamera pozisyonu
            this.camera.position.set(0, 200, 200);
            this.camera.lookAt(0, 0, 0);

            // Işıklandırma
            const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
            this.scene.add(ambientLight);

            const spotLight = new THREE.SpotLight(0xffffff, 0.8);
            spotLight.position.set(0, 200, 0);
            spotLight.castShadow = true;
            this.scene.add(spotLight);

            // Kontroller
            if (typeof THREE.OrbitControls === 'undefined') {
                console.error('OrbitControls is not loaded!');
                return;
            }

            this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
            this.controls.enableDamping = true;
            this.controls.dampingFactor = 0.05;
            this.controls.maxPolarAngle = Math.PI / 2;
            this.controls.minDistance = 100;
            this.controls.maxDistance = 500;

            // Masa oluştur
            this.createTable();
            // Sandalyeleri oluştur
            this.createChairs();

            // Animasyon döngüsü
            this.animate();

            window.addEventListener('resize', () => this.onWindowResize(), false);
        } catch (error) {
            console.error('Error initializing 3D scene:', error);
        }
    }

    createTable() {
        // Masa üst yüzeyi
        const tableShape = new THREE.Shape();
        tableShape.ellipse(0, 0, 120, 80, 0, Math.PI * 2);

        const extrudeSettings = {
            steps: 1,
            depth: 10,
            bevelEnabled: true,
            bevelThickness: 5,
            bevelSize: 3,
            bevelSegments: 8
        };

        const tableGeometry = new THREE.ExtrudeGeometry(tableShape, extrudeSettings);
        const tableMaterial = new THREE.MeshPhongMaterial({ 
            color: 0x0b6623,
            specular: 0x009900,
            shininess: 30
        });

        const table = new THREE.Mesh(tableGeometry, tableMaterial);
        table.rotation.x = -Math.PI / 2;
        table.position.y = 70;
        table.castShadow = true;
        table.receiveShadow = true;
        this.scene.add(table);

        // Masa kenarı
        const edgeGeometry = new THREE.TorusGeometry(100, 8, 16, 100);
        const edgeMaterial = new THREE.MeshPhongMaterial({ 
            color: 0x4a2810,
            specular: 0x222222,
            shininess: 20
        });
        const edge = new THREE.Mesh(edgeGeometry, edgeMaterial);
        edge.rotation.x = Math.PI / 2;
        edge.position.y = 75;
        edge.castShadow = true;
        this.scene.add(edge);

        // Masa bacakları
        const legGeometry = new THREE.CylinderGeometry(5, 8, 70, 8);
        const legMaterial = new THREE.MeshPhongMaterial({ color: 0x4a2810 });
        
        const positions = [
            [-80, -40], [80, -40],
            [-80, 40], [80, 40]
        ];

        positions.forEach(([x, z]) => {
            const leg = new THREE.Mesh(legGeometry, legMaterial);
            leg.position.set(x, 35, z);
            leg.castShadow = true;
            this.scene.add(leg);
        });

        // Zemin
        const floorGeometry = new THREE.PlaneGeometry(1000, 1000);
        const floorMaterial = new THREE.MeshPhongMaterial({ 
            color: 0x222222,
            side: THREE.DoubleSide
        });
        const floor = new THREE.Mesh(floorGeometry, floorMaterial);
        floor.rotation.x = Math.PI / 2;
        floor.position.y = 0;
        floor.receiveShadow = true;
        this.scene.add(floor);
    }

    createChairs() {
        const chairPositions = [
            { angle: 0, radius: 150 },    // Üst
            { angle: Math.PI / 3, radius: 150 },    // Sağ üst
            { angle: 2 * Math.PI / 3, radius: 150 }, // Sağ alt
            { angle: Math.PI, radius: 150 },        // Alt
            { angle: 4 * Math.PI / 3, radius: 150 }, // Sol alt
            { angle: 5 * Math.PI / 3, radius: 150 }  // Sol üst
        ];

        chairPositions.forEach((pos, index) => {
            const chair = this.createChair();
            const x = Math.cos(pos.angle) * pos.radius;
            const z = Math.sin(pos.angle) * pos.radius;
            chair.position.set(x, 40, z);
            chair.lookAt(0, 40, 0);
            this.chairs[index] = chair;
            this.scene.add(chair);
        });
    }

    createChair() {
        const chairGroup = new THREE.Group();

        // Sandalye oturma yeri
        const seatGeometry = new THREE.BoxGeometry(30, 5, 30);
        const seatMaterial = new THREE.MeshPhongMaterial({ 
            color: 0xcc0000,
            specular: 0x222222,
            shininess: 20
        });
        const seat = new THREE.Mesh(seatGeometry, seatMaterial);
        seat.castShadow = true;
        chairGroup.add(seat);

        // Sandalye arkalığı
        const backGeometry = new THREE.BoxGeometry(30, 40, 5);
        const back = new THREE.Mesh(backGeometry, seatMaterial);
        back.position.z = -12.5;
        back.position.y = 22.5;
        back.castShadow = true;
        chairGroup.add(back);

        // Sandalye bacakları
        const legGeometry = new THREE.CylinderGeometry(2, 2, 40, 8);
        const legMaterial = new THREE.MeshPhongMaterial({ color: 0x800000 });

        const legPositions = [
            [-12, -12], [12, -12],
            [-12, 12], [12, 12]
        ];

        legPositions.forEach(([x, z]) => {
            const leg = new THREE.Mesh(legGeometry, legMaterial);
            leg.position.set(x, -20, z);
            leg.castShadow = true;
            chairGroup.add(leg);
        });

        // İnsan silüeti ekle
        const humanGroup = new THREE.Group();
        
        // Gövde
        const bodyGeometry = new THREE.BoxGeometry(14, 30, 10);
        const bodyMaterial = new THREE.MeshPhongMaterial({ color: 0x333333 });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.y = 25;
        body.castShadow = true;
        humanGroup.add(body);

        // Baş
        const headGeometry = new THREE.SphereGeometry(5, 16, 16);
        const head = new THREE.Mesh(headGeometry, bodyMaterial);
        head.position.y = 45;
        head.castShadow = true;
        humanGroup.add(head);

        // Kollar
        const armGeometry = new THREE.BoxGeometry(4, 20, 4);
        
        // Sol kol
        const leftArm = new THREE.Mesh(armGeometry, bodyMaterial);
        leftArm.position.set(-9, 30, 0);
        leftArm.rotation.z = 0.3;
        leftArm.castShadow = true;
        humanGroup.add(leftArm);

        // Sağ kol
        const rightArm = new THREE.Mesh(armGeometry, bodyMaterial);
        rightArm.position.set(9, 30, 0);
        rightArm.rotation.z = -0.3;
        rightArm.castShadow = true;
        humanGroup.add(rightArm);

        // Bacaklar
        const legGeom = new THREE.BoxGeometry(5, 20, 5);
        
        // Sol bacak
        const leftLeg = new THREE.Mesh(legGeom, bodyMaterial);
        leftLeg.position.set(-5, 12, 0);
        leftLeg.rotation.z = 0.1;
        leftLeg.castShadow = true;
        humanGroup.add(leftLeg);

        // Sağ bacak
        const rightLeg = new THREE.Mesh(legGeom, bodyMaterial);
        rightLeg.position.set(5, 12, 0);
        rightLeg.rotation.z = -0.1;
        rightLeg.castShadow = true;
        humanGroup.add(rightLeg);

        // İnsan silüetini sandalyeye ekle
        humanGroup.position.z = 5;
        chairGroup.add(humanGroup);

        // İnsan silüetini başlangıçta gizle (oyuncu katıldığında gösterilecek)
        humanGroup.visible = false;
        humanGroup.name = 'humanSilhouette';

        return chairGroup;
    }

    setRoomId(roomId) {
        this.roomId = roomId;
        // Masa ID'si için 3D text oluştur
        const loader = new THREE.FontLoader();
        loader.load('https://threejs.org/examples/fonts/helvetiker_regular.typeface.json', (font) => {
            const textGeometry = new THREE.TextGeometry(`Oda: ${roomId}`, {
                font: font,
                size: 20,
                height: 2
            });
            const textMaterial = new THREE.MeshPhongMaterial({ color: 0xffffff });
            const textMesh = new THREE.Mesh(textGeometry, textMaterial);
            textMesh.position.set(-50, 100, -150);
            this.scene.add(textMesh);
        });
    }

    updateChairs(userCount) {
        // Mevcut sandalyeleri temizle
        this.chairs.forEach(chair => this.scene.remove(chair));
        this.chairs = [];

        // Yeni sandalye sayısına göre oluştur
        const angles = [];
        for (let i = 0; i < userCount; i++) {
            angles.push((i * 2 * Math.PI) / userCount);
        }

        angles.forEach((angle, index) => {
            const chair = this.createChair();
            const radius = 150;
            const x = Math.cos(angle) * radius;
            const z = Math.sin(angle) * radius;
            chair.position.set(x, 40, z);
            chair.lookAt(0, 40, 0);
            this.chairs[index] = chair;
            this.scene.add(chair);
        });
    }

    addPlayer(position, username, isActive = true) {
        if (this.chairs[position]) {
            // İnsan silüetini göster/gizle
            const humanSilhouette = this.chairs[position].getObjectByName('humanSilhouette');
            if (humanSilhouette) {
                humanSilhouette.visible = isActive;
            }

            // Kullanıcı ismi için sprite
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.width = 512;
            canvas.height = 128;
            
            // Arka plan
            context.fillStyle = isActive ? 'rgba(27, 94, 32, 0.8)' : 'rgba(0, 0, 0, 0.5)';
            context.roundRect(0, 0, canvas.width, canvas.height, 16);
            context.fill();
            
            // Kullanıcı adı
            context.font = 'bold 48px Arial';
            context.fillStyle = 'white';
            context.textAlign = 'center';
            context.textBaseline = 'middle';
            context.fillText(username, canvas.width/2, canvas.height/2);

            const texture = new THREE.CanvasTexture(canvas);
            const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
            const sprite = new THREE.Sprite(spriteMaterial);
            sprite.position.y = 100;
            sprite.scale.set(100, 30, 1);

            // Varsa eski sprite'ı kaldır
            this.chairs[position].children.forEach(child => {
                if (child instanceof THREE.Sprite) {
                    this.chairs[position].remove(child);
                }
            });

            // Sandalyenin rengini güncelle
            this.chairs[position].children.forEach(child => {
                if (child.material && child.material.color) {
                    child.material.color.setHex(isActive ? 0xcc0000 : 0x666666);
                }
            });

            this.chairs[position].add(sprite);
        }
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }

    throwCard(score) {
        // Kart geometrisi
        const cardGeometry = new THREE.BoxGeometry(30, 40, 1);
        const cardMaterial = new THREE.MeshPhongMaterial({ 
            color: 0xffffff,
            side: THREE.DoubleSide
        });
        const card = new THREE.Mesh(cardGeometry, cardMaterial);

        // Kart üzerine sayı yaz
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 128;
        canvas.height = 128;
        context.fillStyle = 'black';
        context.font = 'bold 64px Arial';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(score, canvas.width/2, canvas.height/2);

        const texture = new THREE.CanvasTexture(canvas);
        card.material.map = texture;

        // Kartı masaya fırlat
        card.position.copy(this.camera.position);
        card.position.y = 100;
        this.scene.add(card);

        const targetPos = new THREE.Vector3(
            Math.random() * 40 - 20,
            75,
            Math.random() * 40 - 20
        );

        const duration = 1000; // 1 saniye
        const start = Date.now();

        const animate = () => {
            const now = Date.now();
            const progress = (now - start) / duration;

            if (progress < 1) {
                card.position.lerp(targetPos, progress);
                card.rotation.y += 0.1;
                requestAnimationFrame(animate);
            } else {
                card.position.copy(targetPos);
            }
        };

        animate();
    }

    showAllCards(votes) {
        // Tüm kartları göster
        votes.forEach((vote, userId) => {
            // ... kart gösterme animasyonu
        });
    }

    showPlayerVote(position, score) {
        if (this.chairs[position]) {
            // Varsa eski oy etiketini kaldır
            this.chairs[position].children.forEach(child => {
                if (child.name === 'voteLabel') {
                    this.chairs[position].remove(child);
                }
            });

            // Yeni oy etiketi oluştur
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.width = 256;
            canvas.height = 256;

            // Arka plan
            context.fillStyle = 'rgba(27, 94, 32, 0.9)';
            context.beginPath();
            context.arc(128, 128, 50, 0, Math.PI * 2);
            context.fill();

            // Puan
            context.font = 'bold 80px Arial';
            context.fillStyle = 'white';
            context.textAlign = 'center';
            context.textBaseline = 'middle';
            context.fillText(score, 128, 128);

            const texture = new THREE.CanvasTexture(canvas);
            const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
            const sprite = new THREE.Sprite(spriteMaterial);
            sprite.position.y = 120;
            sprite.scale.set(30, 30, 1);
            sprite.name = 'voteLabel';

            this.chairs[position].add(sprite);
        }
    }

    clearAllVotes() {
        this.chairs.forEach(chair => {
            if (chair) {
                chair.children.forEach(child => {
                    if (child.name === 'voteLabel') {
                        chair.remove(child);
                    }
                });
            }
        });
    }

    showVoteCheck(position) {
        if (this.chairs[position]) {
            // Varsa eski tik işaretini kaldır
            this.chairs[position].children.forEach(child => {
                if (child.name === 'voteCheck') {
                    this.chairs[position].remove(child);
                }
            });

            // Tik işareti sprite'ı oluştur
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.width = 128;
            canvas.height = 128;

            // Yeşil daire
            context.fillStyle = '#4CAF50';
            context.beginPath();
            context.arc(64, 64, 32, 0, Math.PI * 2);
            context.fill();

            // Tik işareti
            context.strokeStyle = 'white';
            context.lineWidth = 8;
            context.beginPath();
            context.moveTo(40, 64);
            context.lineTo(55, 80);
            context.lineTo(88, 48);
            context.stroke();

            const texture = new THREE.CanvasTexture(canvas);
            const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
            const sprite = new THREE.Sprite(spriteMaterial);
            sprite.position.set(20, 100, 0);
            sprite.scale.set(20, 20, 1);
            sprite.name = 'voteCheck';

            this.chairs[position].add(sprite);
        }
    }

    clearAllChecks() {
        this.chairs.forEach(chair => {
            if (chair) {
                chair.children.forEach(child => {
                    if (child.name === 'voteCheck') {
                        chair.remove(child);
                    }
                });
            }
        });
    }
} 