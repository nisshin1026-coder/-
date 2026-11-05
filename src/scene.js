import * as THREE from 'three';

const TAU = Math.PI * 2;
const clamp = THREE.MathUtils.clamp;
const rnd = seed => { let x = (Number(seed) || 17) >>> 0; return () => { x = (1664525 * x + 1013904223) >>> 0; return x / 4294967296; }; };

/** A self-contained illustrated, physically lit miniature sanctuary. */
export class MonsterScene {
  constructor(canvas) {
    this.canvas = canvas;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#e8eee4');
    this.scene.fog = new THREE.Fog('#e8eee4', 17, 32);
    this.camera = new THREE.PerspectiveCamera(35, 1, .1, 80);
    this.camera.position.set(7.5, 6.4, 11.2);
    this.camera.lookAt(0, 1.0, 0);
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.24;
    this.clock = new THREE.Clock();
    this.mode = 'home'; this.pointer = new THREE.Vector2(); this.turn = 0; this.turnV = 0;
    this.actionTime = -20; this.action = ''; this.motion={height:0,velocity:0,impact:0}; this.eyes = []; this.springs = [];
    this.scene.add(new THREE.HemisphereLight('#fff7df', '#6b8c79', 2.2));
    const sun = new THREE.DirectionalLight('#fff0cf', 3.2);
    sun.position.set(-4, 9, 6); sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048); sun.shadow.camera.left = -8; sun.shadow.camera.right = 8;
    sun.shadow.camera.top = 8; sun.shadow.camera.bottom = -8; sun.shadow.normalBias = .035;
    sun.shadow.bias = -.00015; sun.shadow.radius = 4;
    this.scene.add(sun);
    const rim = new THREE.DirectionalLight('#d1edff', 2); rim.position.set(6, 5, -5); this.scene.add(rim);
    this.environment = new THREE.Group(); this.scene.add(this.environment);
    this.buildGarden();
    this.buildArena();
    this.creature = new THREE.Group(); this.scene.add(this.creature);
    this.effects = new THREE.Group(); this.scene.add(this.effects);
    this.resize = () => { const {width, height} = canvas.getBoundingClientRect(); if (!width || !height) return; this.camera.aspect = width / height; this.camera.fov = width < 500 ? 43 : 35; this.camera.updateProjectionMatrix(); this.renderer.setSize(width, height, false); };
    this.observer = new ResizeObserver(this.resize); this.observer.observe(canvas); this.resize();
    this.onPointer = e => { const r = canvas.getBoundingClientRect(); this.pointer.set((e.clientX-r.left)/r.width*2-1, (e.clientY-r.top)/r.height*2-1); };
    this.onLeave = () => this.pointer.set(0, 0);
    canvas.addEventListener('pointermove', this.onPointer); canvas.addEventListener('pointerleave', this.onLeave);
    this.frame = this.frame.bind(this); this.frame();
  }
  material(color, options = {}) { return new THREE.MeshStandardMaterial({color, roughness: .76, metalness: .02, ...options}); }
  mesh(geometry, material, parent, x=0,y=0,z=0, sx=1,sy=1,sz=1) {
    const m = new THREE.Mesh(geometry, material); m.position.set(x,y,z); m.scale.set(sx,sy,sz); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m;
  }
  ball(parent,mat,x,y,z,sx=1,sy=sx,sz=sx) { return this.mesh(new THREE.SphereGeometry(1,28,20),mat,parent,x,y,z,sx,sy,sz); }
  cone(parent,mat,x,y,z,r,h,segments=7) { return this.mesh(new THREE.ConeGeometry(r,h,segments),mat,parent,x,y,z); }
  capsule(parent,mat,a,b,r) {
    const start = new THREE.Vector3(...a), end = new THREE.Vector3(...b), dir = end.clone().sub(start);
    const m = this.mesh(new THREE.CylinderGeometry(r*.82,r,dir.length(),12),mat,parent,...start.clone().add(end).multiplyScalar(.5).toArray());
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),dir.normalize()); return m;
  }
  buildGarden() {
    const r = rnd(339), g = this.environment;
    const top = this.material('#ffffff'), side = this.material('#b1a186'), bottom = this.material('#887c6b');
    const stone = this.mesh(new THREE.CylinderGeometry(3.6,2.5,1.25,11,1),side,g,0,-.8,0); stone.rotation.y=.13;
    const under = this.mesh(new THREE.ConeGeometry(2.6,1.6,9),bottom,g,0,-2.0,0); under.rotation.z=Math.PI;
    this.mesh(new THREE.CylinderGeometry(3.65,3.53,.24,64),top,g,0,-.075,0);
    // Fine speckled grass is a generated texture, with no external asset dependency.
    const texCanvas = document.createElement('canvas'); texCanvas.width=512; texCanvas.height=512;
    const ctx=texCanvas.getContext('2d'); ctx.fillStyle='#a3b18d';ctx.fillRect(0,0,512,512);
    for(let i=0;i<16000;i++){const v=r();ctx.fillStyle=v>.5?'rgba(224,233,171,.09)':'rgba(47,90,63,.05)';ctx.fillRect(r()*512,r()*512,1+r()*3,1+r()*3);}
    const texture=new THREE.CanvasTexture(texCanvas);texture.colorSpace=THREE.SRGBColorSpace;texture.wrapS=texture.wrapT=THREE.RepeatWrapping;
    top.map=texture;top.needsUpdate=true;
    const path=this.material('#dad1b7');
    for(let i=0;i<6;i++){const s=this.mesh(new THREE.CylinderGeometry(.5,.53,.07,6),path,g,-2.4+i*.33,.09,1.85-i*.14,1,.7,.68);s.rotation.y=r()*2;}
    const bark=this.material('#8e7964'), leafA=this.material('#537b60'),leafB=this.material('#78976c'),leafC=this.material('#a9bd80');
    for(const [x,z,scale] of [[-2.35,-1.3,1], [2.2,-1.6,.8],[-2.9,.0,.48]]){
      const tree=new THREE.Group();tree.position.set(x,0,z);tree.scale.setScalar(scale);g.add(tree);
      this.capsule(tree,bark,[0,0,0],[.13,2.3,.05],.12);
      this.capsule(tree,bark,[0,1,0],[-.6,1.75,0],.065);
      this.ball(tree,leafA,.1,2.25,0,.79,.68,.76);
      this.ball(tree,leafB,-.47,1.93,.1,.64,.56,.6);
      this.ball(tree,leafC,.35,2.68,-.03,.58,.48,.52);
      this.ball(tree,leafB,.58,2.07,.05,.55,.57,.49);
      for(let j=0;j<4;j++)this.ball(tree,this.material('#f1ca83'),-.4+j*.25,2.01+r()*.4,.61,.065);
    }
    const grass=this.material('#5e8860'),cream=this.material('#fff1c9'),pink=this.material('#e7a6a4'),yellow=this.material('#e0b966');
    for(let i=0;i<42;i++){
      const angle=r()*TAU,dist=2+r()*1.4,x=Math.cos(angle)*dist,z=Math.sin(angle)*dist;
      if(z>1&&x<-.9)continue;
      const blade=this.cone(g,grass,x,.17,z,.075,.35,4);blade.rotation.z=(r()-.5)*.5;
      if(i%2===0){this.ball(g,i%4?cream:pink,x,.36,z,.1,.07,.1);this.ball(g,yellow,x,.41,z,.035);}
    }
    const rockMat=this.material('#b5b9a3');
    for(let i=0;i<10;i++){const a=r()*TAU,d=3.1+r()*.3;const rock=this.mesh(new THREE.DodecahedronGeometry(.18+r()*.18),rockMat,g,Math.cos(a)*d,.1,Math.sin(a)*d);rock.scale.set(1,.7,1);rock.rotation.set(r(),r(),r());}
    // A tiny shrine gives the sanctuary a memorable, authored silhouette.
    const shrine=new THREE.Group();shrine.position.set(1.52,.08,-2);shrine.rotation.y=-.3;g.add(shrine);
    const arch=this.material('#d8d5b6'),gold=this.material('#bd9c58',{metalness:.45,roughness:.4});
    for(const x of [-.34,.34]) this.mesh(new THREE.BoxGeometry(.14,.92,.18),arch,shrine,x,.46,0);
    this.mesh(new THREE.BoxGeometry(.91,.16,.28),arch,shrine,0,.93,0);
    const gem=this.mesh(new THREE.OctahedronGeometry(.18),gold,shrine,0,.6,0);this.shrineGem=gem;
    this.clouds=[];
    const cloudMat=this.material('#f8f9ee');
    for(let i=0;i<7;i++){
      const cloud=new THREE.Group();const a=i/7*TAU;cloud.position.set(Math.cos(a)*6,-1.2+r()*2,Math.sin(a)*6-2);g.add(cloud);
      for(let k=0;k<3;k++)this.ball(cloud,cloudMat,k*.65-.65,0,0,.65,.26+k%2*.12,.38);
      cloud.userData.phase=i;this.clouds.push(cloud);
    }
    const pgeo=new THREE.BufferGeometry(),positions=new Float32Array(48*3);
    for(let i=0;i<48;i++){positions[i*3]=(r()-.5)*9;positions[i*3+1]=r()*5;positions[i*3+2]=(r()-.5)*7;}
    pgeo.setAttribute('position',new THREE.BufferAttribute(positions,3));
    this.motes=new THREE.Points(pgeo,new THREE.PointsMaterial({color:'#fff4b2',size:.055,transparent:true,opacity:.8,depthWrite:false}));this.scene.add(this.motes);
  }
  clearGroup(group) {
    const geometries=new Set(),materials=new Set();
    group.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>materials.add(m));});
    geometries.forEach(g=>g.dispose());materials.forEach(m=>{if(m.map)m.map.dispose();m.dispose();});group.clear();
  }
  setMonster(monster) {
    if(!monster)return;
    this.monster=monster;this.clearGroup(this.creature);this.eyes=[];this.springs=[];
    this.rng=rnd(monster.seed || Number(String(monster.id).replace(/\D/g,''))*97);
    const p=this.creature,shape=monster.shape||'fox',r=this.rng;
    this.coat=this.material(monster.color||'#d6a36d');this.accent=this.material(monster.accent||'#f6e5b9');
    this.cream=this.material('#fff2d9');this.dark=this.material('#30382f',{roughness:.35});this.shine=this.material('#ffffff',{roughness:.12});this.cheek=this.material('#e79e92');
    const coat=this.coat,accent=this.accent,cream=this.cream;
    const body=new THREE.Group();p.add(body);this.body=body;
    const head=new THREE.Group();body.add(head);this.head=head;
    const compact=['slime','turtle','golem'].includes(shape);
    const bodyY=shape==='serpent'?.67:compact?.7:1.0;
    if(shape==='slime'){
      this.ball(body,coat,0,.83,0,1.02,.91,.86);
      this.ball(body,coat,-.75,.24,.15,.43,.25,.4);this.ball(body,coat,.75,.24,.15,.43,.25,.4);
      head.position.set(0,.9,.5);this.face(head,.7,.34);
      for(let i=0;i<4;i++)this.ball(body,accent,-.5+i*.32,1.4+Math.sin(i)*.1,.48,.095);
      const sprout=new THREE.Group();sprout.position.y=1.63;sprout.userData.isSprout=true;body.add(sprout);this.capsule(sprout,accent,[0,0,0],[.1,.45,0],.035);
      const l=this.ball(sprout,accent,.22,.35,0,.25,.08,.12);l.rotation.z=.45;this.springs.push({o:sprout,base:0,phase:1,axis:'z'});
    } else if(shape==='golem') {
      this.mesh(new THREE.DodecahedronGeometry(1),coat,body,0,1.03,0,.78,.93,.66);
      for(const s of [-1,1]){this.mesh(new THREE.DodecahedronGeometry(.36),accent,body,s*.83,.82,0,1,1.3,1);this.mesh(new THREE.DodecahedronGeometry(.32),coat,body,s*.4,.25,.17,1,.7,1.3);}
      head.position.set(0,1.77,.07);this.mesh(new THREE.DodecahedronGeometry(.65),coat,head,0,0,0,1,.8,.86);this.face(head,.53,.44);
      for(const s of [-1,1])this.cone(head,accent,s*.38,.5,-.07,.16,.55,5);
      this.mesh(new THREE.OctahedronGeometry(.22),accent,body,0,1.12,.62);
    } else if(shape==='bird'){
      this.ball(body,coat,0,.95,0,.69,.83,.61);
      this.ball(body,cream,0,.85,.43,.5,.59,.23);
      head.position.set(0,1.78,.05);this.ball(head,coat,0,0,0,.65,.58,.58);this.face(head,.53,.55,true);
      const beak=this.cone(head,accent,0,-.1,.61,.16,.34,4);beak.rotation.x=Math.PI/2;
      for(const s of [-1,1]){const wing=new THREE.Group();wing.position.set(s*.59,1.2,0);body.add(wing);const feather=this.ball(wing,accent,s*.12,-.28,0,.22,.49,.32);feather.rotation.z=s*.4;this.springs.push({o:wing,base:0,phase:s,axis:'z'});for(let i=0;i<3;i++)this.ball(body,accent,s*.28+(i-1)*.09,.15,.2,.065,.08,.25);}
      for(let i=0;i<3;i++){const plume=this.ball(head,accent,(i-1)*.17,.6,-.08,.12,.36,.12);plume.rotation.z=(1-i)*.25;}
    } else if(shape==='turtle'){
      this.ball(body,coat,0,.65,-.1,1,.63,.97);
      this.ball(body,accent,0,.85,-.16,.91,.59,.87);
      for(let i=0;i<7;i++){const a=i/7*TAU;this.mesh(new THREE.DodecahedronGeometry(.24),coat,body,Math.cos(a)*.62,1.15,Math.sin(a)*.56-.15,1,.35,1);}
      for(const x of [-.65,.65])for(const z of [-.48,.5])this.ball(body,coat,x,.23,z,.32,.24,.4);
      head.position.set(0,.77,.92);this.ball(head,coat,0,0,0,.49,.41,.44);this.face(head,.42,.41);
      this.cone(body,accent,0,1.49,-.16,.22,.62,5);
    } else if(shape==='serpent'){
      for(let i=0;i<10;i++){const a=i*.54;this.ball(body,i%3===0?accent:coat,Math.sin(a)*(.65-i*.035),.22+i*.035,Math.cos(a)*.55-.15,.39-i*.016,.28,.36-i*.013);}
      this.ball(body,coat,0,.89,.18,.4,.72,.4);head.position.set(0,1.65,.26);this.ball(head,coat,0,0,0,.64,.49,.52);this.face(head,.55,.49);
      for(const s of [-1,1]){const fin=this.ball(head,accent,s*.58,.05,-.07,.27,.42,.09);fin.rotation.z=s*.4;}
    } else {
      const isDragon=shape==='dragon',isDeer=shape==='deer',isRabbit=shape==='rabbit';
      this.ball(body,coat,0,bodyY,0,isDeer?.58:.67,isDeer?.69:.73,.58);
      this.ball(body,cream,0,.95,.46,.43,.53,.19);
      for(const s of [-1,1]){
        this.ball(body,coat,s*.43,.28,.2,.29,isDeer?.36:.22,.38);
        const arm=this.ball(body,coat,s*.62,1.00,.14,.2,.34,.25);arm.rotation.z=s*.22;
        this.ball(body,accent,s*.44,.25,.46,.2,.12,.18);
      }
      head.position.set(0,1.91,.13);this.ball(head,coat,0,0,0,isDragon?.72:.78,.63,.63);
      this.ball(head,cream,0,-.24,.48,.43,.24,.25);
      this.face(head,.65,.62);
      for(const s of [-1,1]){
        const ear=new THREE.Group();ear.position.set(s*.48,.42,-.06);ear.rotation.z=-s*.2;head.add(ear);
        if(isRabbit){this.ball(ear,coat,0,.48,0,.2,.66,.17);this.ball(ear,accent,0,.51,.135,.105,.47,.035);}
        else if(isDeer){const e=this.ball(ear,coat,s*.15,.07,0,.32,.14,.16);e.rotation.z=s*.3;this.capsule(head,accent,[s*.3,.4,-.1],[s*.37,1.05,-.15],.06);this.capsule(head,accent,[s*.36,.8,-.13],[s*.63,.98,-.12],.045);this.capsule(head,accent,[s*.35,.69,-.13],[s*.15,.9,-.13],.04);}
        else {const outer=this.cone(ear,coat,0,.22,0,.28,isDragon?.47:.66,3);outer.rotation.y=Math.PI/3;const inner=this.cone(ear,accent,0,.21,.12,.15,isDragon?.26:.42,3);inner.rotation.y=Math.PI/3;}
        this.springs.push({o:ear,base:-s*.2,phase:s,axis:'z'});
      }
      const tail=new THREE.Group();tail.position.set(0,.63,-.46);body.add(tail);tail.rotation.y=.7;
      if(isDragon){for(let i=0;i<5;i++)this.ball(tail,coat,0,-i*.07,-i*.29,.29-i*.041,.24-i*.035,.34-i*.04);for(let i=0;i<3;i++)this.cone(tail,accent,0,.22-i*.07,-i*.3,.11,.22,5);}
      else if(isRabbit||isDeer)this.ball(tail,cream,0,0,-.15,.25);
      else {const t=this.ball(tail,coat,0,.17,-.65,.35,.4,.81);t.rotation.x=-.4;this.ball(tail,cream,0,.47,-1.17,.28,.32,.4);}
      this.springs.push({o:tail,base:.7,phase:2,axis:'y'});
      if(isDragon){for(const s of [-1,1]){const wing=new THREE.Group();wing.position.set(s*.51,1.5,-.3);body.add(wing);const shapeW=new THREE.Shape();shapeW.moveTo(0,0);shapeW.lineTo(s*.85,.65);shapeW.lineTo(s*1.14,-.08);shapeW.quadraticCurveTo(s*.66,.12,s*.67,-.47);shapeW.lineTo(0,-.2);const mesh=this.mesh(new THREE.ExtrudeGeometry(shapeW,{depth:.045,bevelEnabled:true,bevelThickness:.025,bevelSize:.025,bevelSegments:2,steps:1}),accent,wing);this.springs.push({o:wing,base:0,phase:s,axis:'y'});}}
      if(shape==='fox'){for(const s of [-1,1])for(let i=0;i<2;i++){const tuft=this.cone(head,coat,s*(.61+i*.1),-.2-i*.13,.03,.2,.4,3);tuft.rotation.z=s*1.15;}}
      if(shape==='cat'){for(const s of [-1,1])for(let i=0;i<2;i++)this.capsule(head,this.dark,[s*.45,-.2+i*.09,.65],[s*.76,-.23+i*.13,.62],.009);}
    }
    // Elemental marks use tangible forms, making elemental families readable at a glance.
    const element=monster.element;
    if(!['slime','turtle','golem'].includes(shape)){
      if(['ice','thunder','light'].includes(element)){const gem=this.mesh(new THREE.OctahedronGeometry(.14),accent,head,0,.3,.55);gem.scale.y=1.4;}
      if(element==='fire'){for(let i=0;i<3;i++)this.cone(head,accent,(i-1)*.2,.57,-.2,.13,.35+i%2*.18,5);}
      if(element==='water')for(const s of [-1,1]){const fin=this.ball(head,accent,s*.68,-.04,-.1,.14,.32,.08);fin.rotation.z=s*.8;}
      if(element==='poison')for(let i=0;i<3;i++)this.ball(head,accent,(i-1)*.2,.25,.56,.06);
      if(element==='dark')for(const s of [-1,1]){const h=this.cone(head,accent,s*.38,.68,-.16,.13,.46,6);h.rotation.z=-s*.35;}
      if(element==='wind'){const leaf=this.ball(head,accent,.1,.63,-.06,.12,.38,.06);leaf.rotation.z=-.65;}
      if(element==='earth')this.mesh(new THREE.DodecahedronGeometry(.17),accent,head,0,.31,.55,1,.7,.5);
    }
    const scale=1.22+(Number(monster.rarity)||1)*.025;this.creature.scale.setScalar(scale);this.creature.rotation.y=.24;
    // Five subtle markings per family distinguish variants without losing silhouette clarity.
    if(!compact)for(let i=0;i<3;i++)this.ball(body,accent,(i-1)*.17,.92,.635,.045,.065,.02);
    this.addSignature(monster,body,head);
    this.actionTime=-20;this.motion={height:0,velocity:0,impact:0};
    this.applyLayout();
  }
  face(head,size,z,noNose=false) {
    for(const s of [-1,1]){
      const eye=new THREE.Group();eye.position.set(s*size*.48,.03,z);head.add(eye);
      this.ball(eye,this.dark,0,0,0,.105,.145,.068);
      this.ball(eye,this.shine,-.028,.047,.06,.035,.043,.02);
      this.ball(eye,this.shine,.033,-.045,.06,.017);this.eyes.push(eye);
      this.ball(head,this.cheek,s*size*.67,-.17,z-.025,.12,.055,.025);
      const brow=this.ball(head,this.coat,s*size*.48,.245,z-.02,.13,.037,.05);brow.rotation.z=s*-.15;
    }
    if(!noNose){this.ball(head,this.dark,0,-.16,z+.08,.062,.043,.04);const curve=new THREE.QuadraticBezierCurve3(new THREE.Vector3(-.08,-.28,z+.07),new THREE.Vector3(0,-.33,z+.08),new THREE.Vector3(.08,-.28,z+.07));this.mesh(new THREE.TubeGeometry(curve,10,.012,6,false),this.dark,head);}
  }
  buildArena() {
    this.arena=new THREE.Group();this.scene.add(this.arena);this.arena.visible=false;
    const stone=this.material('#a5ada8'),edge=this.material('#717d78'),gold=this.material('#e1d5ab',{metalness:.3,roughness:.5});
    this.mesh(new THREE.CylinderGeometry(4.55,4.25,.55,64),edge,this.arena,0,-.4,0);
    this.mesh(new THREE.CylinderGeometry(4.4,4.4,.13,64),stone,this.arena,0,-.06,0);
    for(const radius of [1.15,3.5,4.1]){
      const ring=this.mesh(new THREE.TorusGeometry(radius,.026,8,96),gold,this.arena,0,.025,0);ring.rotation.x=Math.PI/2;
    }
    for(let i=0;i<12;i++){
      const a=i/12*TAU;const rune=this.mesh(new THREE.BoxGeometry(.07,.018,.24),gold,this.arena,Math.cos(a)*3.83,.03,Math.sin(a)*3.83);rune.rotation.y=-a;
    }
    for(const x of [-3.8,3.8]){
      this.mesh(new THREE.CylinderGeometry(.32,.4,1.2,8),edge,this.arena,x,.6,-2.4);
      this.mesh(new THREE.OctahedronGeometry(.3),gold,this.arena,x,1.5,-2.4);
    }
  }
  addSignature(monster,body,head) {
    // Authored per-species ornaments; seed also changes proportions in a stable way.
    const id=Number(String(monster.id).replace(/\D/g,''))||1;
    const coat=this.coat,accent=this.accent,cream=this.cream;
    const gem=(parent,x,y,z,size=.16)=>this.mesh(new THREE.OctahedronGeometry(size),accent,parent,x,y,z,1,1.5,1);
    const ring=(parent,x,y,z,r=.35)=>{const o=this.mesh(new THREE.TorusGeometry(r,.045,8,32),accent,parent,x,y,z);return o;};
    const leaf=(parent,x,y,z,angle=0,size=.3)=>{const o=this.ball(parent,accent,x,y,z,size*.4,size,size*.18);o.rotation.z=angle;return o;};
    const flower=(parent,x,y,z,size=.15)=>{for(let i=0;i<5;i++){const a=i/5*TAU;this.ball(parent,accent,x+Math.cos(a)*size*.7,y+Math.sin(a)*size*.7,z,size*.5,size*.5,size*.25);}this.ball(parent,cream,x,y,z+.025,size*.35);};
    const horns=(length=.65)=>{for(const sign of [-1,1]){const h=this.cone(head,accent,sign*.42,.58+length*.2,-.16,.14,length,6);h.rotation.z=-sign*.45;}};
    const fan=(count=5)=>{for(let i=0;i<count;i++){const a=(i-(count-1)/2)*.35;const o=this.ball(body,accent,Math.sin(a)*.8,1.08+Math.cos(a)*.5,-.5,.14,.55,.1);o.rotation.z=-a;}};
    const scarf=()=>{const collar=ring(body,0,1.48,.1,.48);collar.rotation.x=Math.PI/2;const end=this.ball(body,accent,.42,1.13,.36,.15,.45,.08);end.rotation.z=.35;};
    const antenna=(count=2)=>{for(let i=0;i<count;i++){const x=(i-(count-1)/2)*.46;this.capsule(head,accent,[x,.4,0],[x*1.5,.95,-.1],.028);gem(head,x*1.5,.97,-.1,.1);}};
    const sideWings=()=>{for(const sign of [-1,1])for(let i=0;i<3;i++)leaf(body,sign*(.64+i*.14),1.3-i*.13,-.23,-sign*(.4+i*.15),.42);};
    if([3,8,11,23,32,37,42,47].includes(id))for(const part of body.children)if(part.userData.isSprout)part.visible=false;
    switch(id){
      case 1: scarf();flower(head,.48,.4,.26,.12);break;
      case 2: leaf(head,.33,.6,-.08,-.7,.32);ring(body,0,1.43,.05,.39).rotation.x=Math.PI/2;break;
      case 3: for(let i=0;i<5;i++){const a=i/5*TAU;this.ball(body,cream,Math.cos(a)*.45,1.62,Math.sin(a)*.4,.24,.2,.23);}this.ball(body,this.cheek,0,1.91,0,.16);break;
      case 4: for(const sign of [-1,1]){const tail=this.ball(body,coat,sign*.48,.63,-.76,.27,.35,.66);tail.rotation.y=sign*.6;}gem(head,0,.34,.65,.12);break;
      case 5: for(const sign of [-1,1])flower(head,sign*.58,.91,-.1,.17);sideWings();break;
      case 6: scarf();for(let i=0;i<3;i++)this.cone(body,accent,(i-1)*.18,.62,-1.0,.12,.4+i%2*.2,5);break;
      case 7: horns(.72);for(const sign of [-1,1])gem(body,sign*.72,1.07,-.2,.18);break;
      case 8: for(let i=0;i<5;i++){const flame=this.cone(body,accent,(i-2)*.22,1.87-Math.abs(i-2)*.10,-.1,.18,.65-Math.abs(i-2)*.08,5);flame.rotation.z=(2-i)*.18;}break;
      case 9: fan(7);for(const sign of [-1,1])ring(body,sign*.84,.85,0,.16);break;
      case 10: for(const sign of [-1,1])ring(head,sign*.46,.9,-.1,.24);flower(body,0,.95,.66,.17);break;
      case 11: ring(body,0,.34,0,1.13).rotation.x=Math.PI/2;for(let i=0;i<3;i++)this.ball(body,cream,(i-1)*.25,1.82+i%2*.2,0,.19);break;
      case 12: for(const sign of [-1,1])for(let i=0;i<3;i++)leaf(head,sign*.76,.05-i*.14,-.05,-sign*.8,.25);break;
      case 13: ring(body,0,1.1,-.8,.7);horns(.48);break;
      case 14: for(let i=0;i<5;i++){const a=i/5*TAU;this.ball(body,cream,Math.cos(a)*.45,1.27,Math.sin(a)*.4-.2,.2);}break;
      case 15: for(let i=0;i<5;i++)gem(body,Math.sin(i*.8)*.5,.25,-.15+Math.cos(i*.8)*.4,.11);antenna(2);break;
      case 16: for(const sign of [-1,1])leaf(head,sign*.46,.67,0,-sign*.4,.43);leaf(body,0,.85,-.8,.6,.65);break;
      case 17: sideWings();flower(head,.42,.35,.24,.13);break;
      case 18: fan(5);this.cone(head,accent,0,.7,-.15,.2,.6,4);break;
      case 19: for(let i=0;i<3;i++){const tail=this.ball(body,accent,(i-1)*.35,.71,-.83,.2,.26,.65);tail.rotation.y=(i-1)*.5;}break;
      case 20: for(const sign of [-1,1])for(let i=0;i<3;i++)leaf(head,sign*(.36+i*.13),.82+i*.12,-.13,sign*.7,.19);break;
      case 21: this.ball(head,accent,0,.48,0,.73,.18,.6);for(let i=0;i<3;i++)leaf(head,(i-1)*.15,.72,0,(i-1)*.6,.2);break;
      case 22: for(let i=0;i<5;i++){const a=i/5*TAU;this.capsule(body,cream,[0,1.43,-.2],[Math.cos(a)*.8,.85,Math.sin(a)*.65-.2],.033);}break;
      case 23: ring(body,0,1.68,0,.57).rotation.x=Math.PI/2;leaf(body,.13,2.0,0,.6,.31);leaf(body,-.14,1.97,0,-.6,.25);break;
      case 24: for(let i=0;i<5;i++)gem(body,0,1.67-i*.19,-.5-i*.15,.2-i*.02);break;
      case 25: this.mesh(new THREE.BoxGeometry(.95,.19,.72),accent,head,0,.45,0);flower(body,0,1.16,.7,.18);for(const sign of [-1,1])gem(body,sign*.9,1.2,0,.2);break;
      case 26: for(const sign of [-1,1])this.ball(head,cream,sign*.55,.45,-.03,.28,.22,.23);scarf();break;
      case 27: for(const sign of [-1,1])gem(head,sign*.52,.53,-.1,.2);for(let i=0;i<3;i++)gem(body,(i-1)*.26,.9,-.64,.12);break;
      case 28: antenna(2);ring(body,.5,.31,-.2,.16);break;
      case 29: for(const sign of [-1,1])for(let i=0;i<3;i++)gem(body,sign*(.65+i*.16),1.1-i*.12,0,.18);break;
      case 30: horns(.95);for(const sign of [-1,1])gem(body,sign*.68,1.53,-.35,.3);break;
      case 31: for(const sign of [-1,1])gem(head,sign*.52,1.52,-.03,.19);break;
      case 32: antenna(2);ring(body,0,.7,0,1.05).rotation.x=.5;break;
      case 33: for(const sign of [-1,1]){const t=this.cone(body,accent,sign*.33,.65,-1,.23,.8,3);t.rotation.x=-.7;}break;
      case 34: fan(7);antenna(1);break;
      case 35: horns(.65);gem(body,0,1.1,.7,.3);for(const sign of [-1,1])this.cone(body,accent,sign*.9,1.14,-.3,.18,.6,3);break;
      case 36: ring(head,0,1.38,-.1,.37).rotation.x=.35;sideWings();break;
      case 37: for(let i=0;i<5;i++){const a=i/5*TAU;gem(body,Math.cos(a)*.47,.9+Math.sin(a)*.4,.81,.09);}ring(body,0,1.87,0,.28).rotation.x=.5;break;
      case 38: scarf();ring(body,0,.75,-.85,.44);break;
      case 39: sideWings();ring(head,0,.93,-.08,.36).rotation.x=.45;break;
      case 40: for(const sign of [-1,1])gem(head,sign*.55,1.05,-.13,.22);ring(head,0,1.03,-.19,.65);break;
      case 41: this.ball(head,accent,.48,.4,.2,.16,.16,.08);this.ball(head,coat,.55,.47,.22,.13,.13,.08);scarf();break;
      case 42: for(const sign of [-1,1]){const fin=this.cone(body,accent,sign*.95,1.23,0,.29,.85,3);fin.rotation.z=-sign*.6;}break;
      case 43: ring(body,0,.85,-.9,.55);horns(.35);break;
      case 44: fan(5);gem(head,0,.4,.51,.14);break;
      case 45: ring(head,0,.78,-.2,.7);horns(.9);break;
      case 46: for(const sign of [-1,1])this.ball(head,accent,sign*.54,1.43,0,.35,.17,.29);for(const sign of [-1,1])this.ball(head,cream,sign*.62,1.55,.1,.065);break;
      case 47: for(let i=0;i<3;i++)flower(body,(i-1)*.35,1.98-Math.abs(i-1)*.2,.18,.22);break;
      case 48: flower(head,0,.41,.38,.22);for(const sign of [-1,1])leaf(head,sign*.62,.18,0,-sign*.7,.35);break;
      case 49: for(const sign of [-1,1])for(let i=0;i<4;i++)leaf(body,sign*(.6+i*.13),1.3-i*.15,0,-sign*.6,.36);flower(head,0,.6,0,.17);break;
      case 50: horns(.63);flower(body,0,1.12,.66,.27);for(const sign of [-1,1])leaf(body,sign*.66,1.13,-.28,-sign*.6,.49);break;
    }
    const seeded=rnd(monster.seed);
    body.scale.x=.94+seeded()*.14;body.scale.z=.94+seeded()*.14;
    head.scale.setScalar(.95+seeded()*.11);
  }
  setOpponent(monster) {
    if(this.opponent){this.scene.remove(this.opponent);this.clearGroup(this.opponent);this.opponent=null;this.opponentRig=null;}
    if(!monster){this.applyLayout();return;}
    const keys=['creature','monster','body','head','eyes','springs','coat','accent','cream','dark','shine','cheek','rng','actionTime','motion'];
    const saved=Object.fromEntries(keys.map(k=>[k,this[k]]));
    this.creature=new THREE.Group();this.scene.add(this.creature);this.setMonster(monster);
    const opponent=this.creature,rig={body:this.body,head:this.head,eyes:this.eyes,springs:this.springs,motion:this.motion};
    Object.assign(this,saved);this.opponent=opponent;this.opponentRig=rig;this.applyLayout();
  }
  applyLayout() {
    if(!this.creature)return;
    const battle=this.mode==='battle';this.environment.visible=!battle;this.arena.visible=battle;
    this.creature.position.set(battle?-1.7:0,0,battle?.35:0);
    this.creature.rotation.y=battle?.65:.24;
    if(this.opponent){this.opponent.visible=battle;this.opponent.position.set(1.7,0,-.35);this.opponent.rotation.y=-.8;}
    if(battle){this.camera.position.set(6,5.5,13);this.camera.lookAt(0,1,0);}
    else {this.camera.position.set(7.5,6.4,11.2);this.camera.lookAt(0,1,0);}
  }
  setMode(mode) { this.mode=mode;this.scene.background.set(mode==='battle'?'#e5e4ec':mode==='explore'?'#dce9e2':'#e8eee4');this.scene.fog.color.copy(this.scene.background);this.applyLayout(); }

  play(action) {
    this.action=action;this.actionTime=this.clock.elapsedTime;this.clearGroup(this.effects);
    this.motion.velocity=action==='train'?3.5:action==='attack'?2.2:action==='pet'?2.6:1.9;
    this.motion.impact=.65;this.effects.position.copy(this.creature.position);
    const color=action==='feed'?'#f2b185':action==='train'?'#f4d27b':action==='attack'?'#9dbce7':'#e7a7b4';
    const mat=this.material(color,{emissive:color,emissiveIntensity:.25});
    for(let i=0;i<12;i++){const star=this.mesh(new THREE.OctahedronGeometry(.065),mat,this.effects,0,1.3,0);star.userData={a:i/12*TAU,s:.7+Math.random()*.6};}
  }
  stepRig(rig,dt,t,active) {
    const motion=rig.motion;let remaining=dt;
    // Semi-implicit integration with fixed maximum substeps keeps collisions and
    // ear/tail springs stable on low-frame-rate devices. Units are meters/seconds.
    while(remaining>0){
      const h=Math.min(remaining,1/120);remaining-=h;
      if(motion.height>0||motion.velocity>0){
        motion.velocity-=9.81*h;motion.height+=motion.velocity*h;
        if(motion.height<0){
          motion.height=0;const speed=Math.abs(motion.velocity);motion.impact=Math.min(speed*.2,1);
          motion.velocity=speed>.65?speed*.22:0;
        }
      }
      motion.impact*=Math.exp(-h*12);
      for(const spring of rig.springs){
        if(spring.angle===undefined){spring.angle=spring.base;spring.velocity=0;}
        const target=spring.base+Math.sin(t*1.7+spring.phase)*.035+(active?this.turn*.25:0)+motion.impact*Math.sign(spring.phase||1)*.2;
        const stiffness=spring.axis==='y'?28:42,damping=spring.axis==='y'?5:6;
        spring.velocity+=((target-spring.angle)*stiffness-damping*spring.velocity-motion.velocity*.25)*h;
        spring.angle=clamp(spring.angle+spring.velocity*h,spring.base-.5,spring.base+.5);
        spring.o.rotation[spring.axis]=spring.angle;
      }
    }
    rig.body.position.y=Math.sin(t*2)*.025+motion.height;
    rig.body.scale.y=1+Math.sin(t*2)*.012-motion.impact*.055;
    rig.head.rotation.z=Math.sin(t*.7)*.025+(active&&t-this.actionTime<1.2?Math.sin((t-this.actionTime)*11)*.09:0);
    rig.head.rotation.y=active?this.turn*.25:0;
  }
  frame() {
    if(this.disposed)return;
    this.raf=requestAnimationFrame(this.frame);const dt=Math.min(this.clock.getDelta(),.05),t=this.clock.elapsedTime;
    this.turnV+=(this.pointer.x*.22-this.turn)*dt*25;this.turnV*=Math.exp(-dt*7);this.turn+=this.turnV*dt;
    this.creature.rotation.y=(this.mode==='battle'?.65:.24)+this.turn;
    if(this.opponentRig){const rig=this.opponentRig;this.stepRig(rig,dt,t+.9,false);rig.eyes.forEach(e=>e.scale.y=t%5.3<.13?.13:1);}
    if(this.body)this.stepRig({body:this.body,head:this.head,springs:this.springs,motion:this.motion},dt,t,true);
    const blink=t%4.8;const eyeScale=blink<.14?Math.max(.08,Math.abs(blink-.07)/.07):1;this.eyes.forEach(e=>e.scale.y=eyeScale);
    for(const cloud of this.clouds)cloud.position.y+=Math.sin(t*.6+cloud.userData.phase)*dt*.035;
    if(this.shrineGem)this.shrineGem.rotation.y=t*.5;
    this.motes.rotation.y=t*.025;
    const a=t-this.actionTime;for(const star of this.effects.children){star.visible=a<1.6;star.position.set(Math.cos(star.userData.a)*a*star.userData.s,1.3+a*1.8-a*a*.45,Math.sin(star.userData.a)*a*star.userData.s);star.rotation.set(a,a*2,a);star.scale.setScalar(Math.max(0,1-a/1.6));}
    this.renderer.render(this.scene,this.camera);
  }
  dispose(){this.disposed=true;cancelAnimationFrame(this.raf);this.observer.disconnect();this.canvas.removeEventListener('pointermove',this.onPointer);this.canvas.removeEventListener('pointerleave',this.onLeave);this.clearGroup(this.scene);this.renderer.dispose();}
}
