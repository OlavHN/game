THREE.lockPointer = function(elem) {
  var fullscreenChange = function() {
    elem.requestPointerLock = elem.requestPointerLock ||
      elem.mozRequestPointerLock ||
      elem.webkitRequestPointerLock;

    elem.requestPointerLock(); 
  };
  
  var pointerLockChange = function() { 
    console.log('Hola!')
  };

  document.addEventListener('fullscreenchange', fullscreenChange, false);
  document.addEventListener('mozfullscreenchange', fullscreenChange, false);
  document.addEventListener('webkitfullscreenchange', fullscreenChange, false);
  document.addEventListener('pointerlockchange', pointerLockChange, false);
  document.addEventListener('mozpointerlockchange', pointerLockChange, false);
  document.addEventListener('webkitpointerlockchange', pointerLockChange, false);

  elem.addEventListener('click', function() {
    elem.requestFullscreen = elem.requestFullscreen ||
      elem.mozRequestFullScreen ||
      elem.webkitRequestFullscreen;

    elem.requestFullscreen(); 
  }, false);
}

function asLoadable() {
  this.load = function(objUrl, mtlUrl, callback) {
    if (!callback)
      callback = function noop() {};

    var loader = new THREE.OBJMTLLoader();
    var self = this;
    loader.load(objUrl, mtlUrl, function(object3d) {
      self.object = object3d;
      if (callback)
        callback(object3d);
    });
  };
  return this;
}

function Ship() {}

asLoadable.call(Ship.prototype);

var scene, camera, renderer, controls, ship, sphere, clock;

init();
animate();

function init() {
  THREE.lockPointer(document.body);

  scene = new THREE.Scene();

  renderer = new THREE.WebGLRenderer();
  renderer.setSize( window.innerWidth, window.innerHeight );
  document.body.appendChild(renderer.domElement);
  
  // CAMERA
  camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );

  window.addEventListener('resize', function() {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix(); 
  }, false);

  var light = new THREE.PointLight(0xffffff);
  light.position.set(-100,200,100);
  scene.add(light);
  var light = new THREE.PointLight(0xffffff);
  light.position.set(100,-200,-100);
  scene.add(light);
  scene.add(new THREE.AmbientLight(0xFFFFFF));

  
  //BACKGROUND
  var hemisphereMaterial = new THREE.MeshBasicMaterial({
    map: THREE.ImageUtils.loadTexture('resources/background.jpg'),
    side: THREE.DoubleSide
  });

  sphere = new THREE.Mesh(new THREE.SphereGeometry (101, 30, 30), hemisphereMaterial);
  scene.add(sphere);

  // SHIP
  ship = new Ship();
  ship.load('resources/ship/ship1.obj', 'resources/ship/ship1.mtl', function(ship) {
    ship.scale.set(1/300,1/300,1/300);

    controls = new THREE.spaceControls(camera, ship);
    scene.add(controls.object);
  });

  clock = new THREE.Clock();

  // ADD AXIS
  var axis = new THREE.AxisHelper( 50 );
  scene.add(axis);
}

function animate() {
  requestAnimationFrame(animate);

  var delta = clock.getDelta();
  renderer.render(scene, camera);

  if (controls) {
    controls.update(delta);
    sphere.position = controls.object.position;
  }
  
  
};

THREE.spaceControls = function(camera, ship) {
  var keyToCode = {
    ACCELERATE: 32,
    PITCH_DOWN: 87, 
    PITCH_UP: 83,
    ROLL_LEFT: 65,
    ROLL_RIGHT: 68
  };

  this.keys = {
    32: 0,
    87: 0,
    83: 0,
    65: 0,
    68: 0
  };

  var scope = this;

  this.ship = ship;
  this.camera = camera;
  this.object = new THREE.Object3D();
  this.moveVector = new THREE.Vector3();
  this.rotationVector = new THREE.Vector3();
  this.tmpQuaternion = new THREE.Quaternion();
  this.theta = 45;
  this.phi = 60;

  this.camera.position.set(0, 0, -5);
  this.camera.lookAt(this.object.position);

  this.object.add(camera);
  this.object.add(ship);

  window.addEventListener('keydown', function(evt) {
    if (evt.keyCode in scope.keys) {
      scope.keys[evt.keyCode] = 1;
      evt.preventDefault();
      evt.stopPropagation();
    }
  });
  window.addEventListener('keyup', function(evt) {
    if (evt.keyCode in scope.keys) {
      scope.keys[evt.keyCode] = 0;
      evt.preventDefault();
      evt.stopPropagation();
    }
  });

  window.addEventListener('mousemove', function(evt) {
    var movementX = evt.movementX || evt.mozMovementX || evt.webkitMovementX || 0;
    var movementY = evt.movementY || evt.mozMovementY || evt.webkitMovementY || 0;
    scope.theta -= movementX;
    scope.phi += movementY;

    scope.phi = Math.min( 90, Math.max( -90, scope.phi ) );

    scope.camera.position.x = 5 * Math.sin( scope.theta * Math.PI / 360 ) * Math.cos( scope.phi * Math.PI / 360 );
    scope.camera.position.y = 5 * Math.sin( scope.phi * Math.PI / 360 );
    scope.camera.position.z = 5 * Math.cos( scope.theta * Math.PI / 360 ) * Math.cos( scope.phi * Math.PI / 360 ); 

    scope.camera.lookAt(scope.ship.position);
  });

  this.update = function(delta) {
    // Dampen
    this.moveVector.z -= (this.moveVector.z * 10 * delta);
    this.rotationVector.y -= (this.rotationVector.y * 1.1 * delta);
    this.rotationVector.x -= (this.rotationVector.x * 1.1 * delta);

    // Actions
    if (this.keys[keyToCode.ACCELERATE])
      this.moveVector.z += 200 * delta;

    this.rotationVector.y += (this.keys[keyToCode.ROLL_LEFT] - this.keys[keyToCode.ROLL_RIGHT]) * 2 * delta;

    this.rotationVector.x += (this.keys[keyToCode.PITCH_DOWN] - this.keys[keyToCode.PITCH_UP]) * 2 * delta;

    // Transform
    this.object.translateZ(this.moveVector.z * delta);

    this.tmpQuaternion.set(
      this.rotationVector.x * 1 * delta,
      this.rotationVector.y * 1 * delta,
      this.rotationVector.z * 1 * delta,
      1
    ).normalize();

    this.object.translateZ(this.moveVector.z * delta);
    this.object.quaternion.multiply(this.tmpQuaternion);

    // UI
    this.ship.rotation.set(this.rotationVector.x,0,-this.rotationVector.y);
  };
  return this;
}

