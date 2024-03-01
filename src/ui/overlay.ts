const earthDiv = document.createElement( 'div' );
earthDiv.className = 'label';
earthDiv.textContent = 'Earth';
earthDiv.style.backgroundColor = 'transparent';

const earthLabel = new CSS2DObject( earthDiv );
earthLabel.position.set( 1.5 * EARTH_RADIUS, 0, 0 );
earthLabel.center.set( 0, 1 );
earth.add( earthLabel );
earthLabel.layers.set( 0 );

const earthMassDiv = document.createElement( 'div' );
earthMassDiv.className = 'label';
earthMassDiv.textContent = '5.97237e24 kg';
earthMassDiv.style.backgroundColor = 'transparent';

const earthMassLabel = new CSS2DObject( earthMassDiv );
earthMassLabel.position.set( 1.5 * EARTH_RADIUS, 0, 0 );
earthMassLabel.center.set( 0, 0 );
earth.add( earthMassLabel );
earthMassLabel.layers.set( 1 );