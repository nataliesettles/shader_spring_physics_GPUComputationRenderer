

var renderer, scene, camera;

var particleSystem, particleUniforms;

var width, height, particles; // width and height of the texture carrying a texel for each particle

var positionUniforms;

var WIDTH = window.innerWidth;
var HEIGHT = window.innerHeight;

var cloudWidth = 50;
var cloudHeight = 50;

var last = performance.now();

var gpuCompute;
var positionVariable;
var positionUniforms;


// Returns a random integer between min (included) and max (included)
// Using Math.round() will give you a non-uniform distribution!
function getRandomIntInclusive(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function init() {

    renderer = new THREE.WebGLRenderer( { antialias: false, premultipliedAlpha : false } );
	renderer.setPixelRatio( window.devicePixelRatio );
	renderer.setSize( WIDTH, HEIGHT );

	var container = document.getElementById( 'container' );
	container.appendChild( renderer.domElement );

    scene = new THREE.Scene();
    // scene.position = THREE.Vector3(WIDTH/2, HEIGHT/2, 0);
    
    camera = new THREE.OrthographicCamera( WIDTH / - 2, WIDTH / 2, HEIGHT / 2, HEIGHT / - 2, 1, 1000 );
    camera.position.set( 0,0,500 );
    camera.lookAt( scene.position );
    
    // Interesting - so this accounts for needing to make textures a factor of two
    // var width = 512, height = 512;
	// var width = 64, height = 64;
	// var width = 128, height = 128;
    // var width = 32, height = 32;
    // width = 16;
    // height = 16;
    width = 8;
    height = 8;
    // width = 4;
    // height = 4;
    particles = width * height;

    initComputeRenderer();

    // particles

	geometry = new THREE.BufferGeometry();

    var positions2 = new Float32Array( particles * 3 );
    var textureIndexArray = new Float32Array( particles );

	for ( var j = 0, j3 = 0, l = width * height; j < l; j ++, j3 += 3 ) {

		positions2[ j3 + 0 ] = ( j % width ) / width ;
		positions2[ j3 + 1 ]  = Math.floor( j / width ) / height;
		positions2[ j3 + 2 ]  = l * 0.01; // this is the real z value for the particle display

        textureIndexArray[ j ] = getRandomIntInclusive( 0,9 );

	}

    console.log("textureIndexArray");
    console.log(textureIndexArray);

	geometry.addAttribute( 'position', new THREE.BufferAttribute( positions2, 3 ) );
    geometry.addAttribute( 'aTextureIndex', new THREE.BufferAttribute( textureIndexArray, 1 ) );
    
    var numTexturesInSheet = 10.0;

    particleUniforms = {
        "tPositions": { type: "t", value: null },
        "texture": { type: "t", value: new THREE.TextureLoader().load( "/hatchSheet.png" ) },
        "width": { type: "f", value: width },
        "height": { type: "f", value: height },
        "uTextureCoordSizeX" : { type : "f", value : 1.0 / numTexturesInSheet },
        "uTextureCoordSizeY" : { type : "f", value : 1.0 }, // the size of a texture in the texture map ( they're square, thus only one value )
        "pointSize": { type: "f", value: 30 }
    };

	material = new THREE.ShaderMaterial( {
		uniforms: particleUniforms,
		vertexShader: document.getElementById( 'vs-particles' ).textContent,
		fragmentShader: document.getElementById( 'fs-particles' ).textContent,
		blending: THREE.AdditiveBlending,
		depthTest: false,
		transparent: true
    } );

	mesh = new THREE.Points( geometry, material );
	scene.add( mesh );
    

	var axis1 = new THREE.AxisHelper(cloudWidth);
    // axis1.position = new THREE.Vector3(-cloudWidth, -cloudWidth, 0);
	scene.add(axis1);

    window.addEventListener( 'resize', onWindowResize, false );
}

function initComputeRenderer() {

    gpuCompute = new GPUComputationRenderer( width, width, renderer );

    // Start Creation of DataTexture

    var positions = new Float32Array( particles * 4 );
    // var gridPositions = new Float32Array( particles * 4 );
    var offsets = new Float32Array( particles * 4 );

    // var somePositions = [
    // 10.885510444641113, -6.274578094482422, 0, 0,
    // -10.12020206451416, 0.8196354508399963, 0, 0,
    // 35.518341064453125, -5.810637474060059, 0, 0,
    // 3.7696402072906494, -3.118760347366333, 0, 0,
    // 9.090447425842285, -7.851400375366211, 0, 0,
    // -32.53229522705078, -26.4628849029541, 0, 0,
    // 32.3623046875, 22.746187210083008, 0, 0,
    // 7.844726085662842, -15.305091857910156, 0, 0,
    // -32.65345001220703, 22.251712799072266, 0, 0,
    // -25.811357498168945, 32.4153938293457, 0, 0,
    // -28.263731002807617, -31.015430450439453, 0, 0,
    // 2.0903847217559814, 1.7632032632827759, 0, 0,
    // -4.471604347229004, 8.995194435119629, 0, 0,
    // -12.317420959472656, 12.19576358795166, 0, 0,
    // 36.77312469482422, -14.580523490905762, 0, 0,
    // 36.447078704833984, -16.085195541381836, 0, 0];
    
    for ( var i = 0, i4 = 0; i < particles; i ++, i4 +=4 ) {

        positions[ i4 + 0 ] = ( Math.random() * 2 - 1 ) * cloudWidth; // x
        positions[ i4 + 1 ] = ( Math.random() * 2 - 1 ) * cloudHeight; // y
        positions[ i4 + 2 ] = 0.0; // velocity
        positions[ i4 + 3 ] = 0.0; // velocity

        // sanity check
        // positions[ i4 + 0 ] = somePositions[ i4 + 0 ]; // x
        // positions[ i4 + 1 ] = somePositions[ i4 + 1 ]; // y
        // positions[ i4 + 2 ] = 0.0; // velocity
        // positions[ i4 + 3 ] = 0.0; // velocity
        
        // gridPositions[ i4 + 0 ] = 0.0; // x 
        // gridPositions[ i4 + 1 ] = 0.0; // y
        // gridPositions[ i4 + 2 ] = 0.0;  // z
        // gridPositions[ i4 + 3 ] = 0.0;  // w - not used
        
        offsets[ i4 + 0 ] = positions[ i4 + 0 ];// - gridPositions[ i4 + 0 ]; // width offset
        offsets[ i4 + 1 ] = positions[ i4 + 1 ];// - gridPositions[ i4 + 1 ]; // height offset
        offsets[ i4 + 2 ] = 0.0; // not used
        offsets[ i4 + 3 ] = 0.0; // not used

    }

    console.log(positions);
    console.log( offsets );
    // console.log( gridPositions );

    var dtPosition = gpuCompute.createTexture();
    dtPosition.image.data = positions;

    positionVariable = gpuCompute.addVariable( "tPositions", document.getElementById( 'position_fragment_shader' ).textContent, dtPosition );

    // gpuCompute.setVariableDependencies( velocityVariable, [ positionVariable, velocityVariable ] );
    gpuCompute.setVariableDependencies( positionVariable, [ positionVariable ] );

    positionUniforms = positionVariable.material.uniforms;

    offsetsTexture = new THREE.DataTexture( offsets, width, height, THREE.RGBAFormat, THREE.FloatType );
    // offsetsTexture.wrapS = THREE.RepeatWrapping;
    // offsetsTexture.wrapT = THREE.RepeatWrapping;
    // offsetsTexture.minFilter = THREE.NearestFilter;
    // offsetsTexture.magFilter = THREE.NearestFilter;
    // offsetsTexture.stencilBuffer = false;
    offsetsTexture.needsUpdate = true;

    positionUniforms.tOffsets = { type: "t", value: offsetsTexture };
    positionUniforms.uTime = { type: "f", value: 0.0 };
    positionUniforms.uXOffW = { type: "f", value: 0.0 };

    positionVariable.wrapS = THREE.RepeatWrapping;
    positionVariable.wrapT = THREE.RepeatWrapping;

    var error = gpuCompute.init();
    if ( error !== null ) {
        console.error( error );
    }

}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	renderer.setSize( window.innerWidth, window.innerHeight );
}

function animate() {
    requestAnimationFrame( animate );
    update();
	render();
    
}

function render() {
    // renderer.clear();
    renderer.render( scene, camera );
}
    
function update() {
    // var now = performance.now();
    // var delta = (now - last) / 1000;

    // if (delta > 1) delta = 1; // safety cap on large deltas
    // last = now;

    positionUniforms.uTime.value += 0.01;
    positionUniforms.uXOffW.value = 0.05;

    gpuCompute.compute();

    particleUniforms.tPositions.value = gpuCompute.getCurrentRenderTarget( positionVariable ).texture;
    // renderer.clear();
}


init();
animate();

