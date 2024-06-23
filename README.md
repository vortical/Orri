
A 3D web application crafted to faithfully visualize celestial bodies within our solar system. 

Initial positions and velocities are retrieved from a [simple ephemeris like REST API](https://vortical.hopto.org/spacefield/docs) which was created to support the Web Application. It is on [my github](https://github.com/vortical/spacefield).

For example: [https://vortical.hopto.org/spacefield/ephemeris/barycentrics/moon?time=2024-04-07T16%3A40%3A54.324Z](https://vortical.github.io/spacefield/ephemeris/barycentrics/moon?time=2024-04-07T16%3A40%3A54.324Z).

Once the initial conditions are established, positions and velocities are maintained with a [leap frog approach](https://en.wikipedia.org/wiki/Leapfrog_integration) to update the state based on clock time and scale. The N-Body calculations naively consider all the bodies given that we only have around 40 bodies to update. I have another algorithm which implements [BarnsHut in 3D](https://github.com/vortical/BarnsHut) which offers the option to view the octree. It should eventually makes its way into this web application.


The web app is currently hosted on github [https://vortical.github.io/Orri/](https://vortical.github.io/Orri/) and [https://vortical.hopto.org/Orri/](https://vortical.hopto.org/Orri/), be aware that the inital load of imagery may take some time.


Here are some quick links:

* [April 8 eclipse 'Penumbra'](https://vortical.github.io/Orri/?state=%7B%22cameraPosition%22:%7B%22x%22:-142763065.42521378,%22y%22:-19573350.084265273,%22z%22:45230955.46157217%7D,%22targetPosition%22:%7B%22x%22:-142783877.125559,%22y%22:-19569576.091407318,%22z%22:45223580.80306858%7D,%22target%22:%22Earth%22,%22sizeScale%22:1,%22timeScale%22:300,%22fov%22:35,%22ambientLightLevel%22:0.025,%22showAxes%22:false,%22castShadows%22:true,%22shadowType%22:%22Penumbra%22,%22date%22:1712593276704,%22showNames%22:true,%22showDistance%22:true,%22showAltitudeAzimuth%22:true,%22location%22:%7B%22lat%22:43.3651712,%22lon%22:-73.6165888%7D,%22targettingCameraMode%22:%7B%22name%22:%22Follow%20Target%22%7D%7D) - 300X !

* [How we saw eclipse from my location](https://vortical.github.io/Orri/?state=%7B%22cameraPosition%22:%7B%22x%22:-142770374.98735818,%22y%22:-19576155.673214175,%22z%22:45247839.236266516%7D,%22targetPosition%22:%7B%22x%22:-142432785.55067572,%22y%22:-19534950.555029165,%22z%22:45147625.847624965%7D,%22target%22:%22Moon%22,%22sizeScale%22:1,%22timeScale%22:600,%22fov%22:3.5,%22ambientLightLevel%22:0.12,%22showAxes%22:false,%22castShadows%22:false,%22shadowType%22:%22Penumbra%22,%22date%22:1712594207750,%22showNames%22:true,%22showDistance%22:false,%22showAltitudeAzimuth%22:true,%22location%22:%7B%22lat%22:43.3651712,%22lon%22:-73.6165888%7D,%22targettingCameraMode%22:%7B%22name%22:%22View%20From%20lat,lon%22%7D%7D) - Narrowly missed totality.

* [The moon as seen on March 28](https://vortical.github.io/Orri/?state=%7B%22cameraPosition%22:%7B%22x%22:-148814231.50303563,%22y%22:-9041350.084379993,%22z%22:20945780.003257766%7D,%22targetPosition%22:%7B%22x%22:-149059446.4362068,%22y%22:-9187879.16307359,%22z%22:21221459.035939015%7D,%22target%22:%22Moon%22,%22sizeScale%22:1,%22timeScale%22:1,%22fov%22:0.6,%22ambientLightLevel%22:0.03,%22showAxes%22:false,%22castShadows%22:false,%22shadowType%22:%22Penumbra%22,%22date%22:1711681439757,%22showNames%22:true,%22showDistance%22:false,%22showAltitudeAzimuth%22:true,%22location%22:%7B%22lat%22:43.3752261,%22lon%22:-73.6368939%7D,%22targettingCameraMode%22:%7B%22name%22:%22View%20From%20lat,lon%22%7D%7D) - As it rose from the horizon at 23:04:03 EST.

* [Deimos](https://vortical.github.io/Orri/?state=%7B%22cameraPosition%22:%7B%22x%22:206905751.93071997,%22y%22:3172183.481029162,%22z%22:-19024591.629030142%7D,%22targetPosition%22:%7B%22x%22:206905837.36984488,%22y%22:3172151.7023505797,%22z%22:-19024612.184905514%7D,%22target%22:%22Deimos%22,%22sizeScale%22:1,%22timeScale%22:60,%22fov%22:35.2,%22ambientLightLevel%22:0.03,%22showAxes%22:false,%22castShadows%22:false,%22shadowType%22:%22Penumbra%22,%22date%22:1719158474798,%22showNames%22:true,%22showDistance%22:true,%22showAltitudeAzimuth%22:true,%22location%22:%7B%22lat%22:43.3752261,%22lon%22:-73.6368939%7D,%22targettingCameraMode%22:%7B%22name%22:%22Follow%20Target%22%7D%7D) - One of Mars' two moons.

* [Saturn](https://vortical.github.io/Orri/?state=%7B%22cameraPosition%22:%7B%22x%22:1384893497.1778412,%22y%22:-210542956.98469165,%22z%22:365295222.85550684%7D,%22targetPosition%22:%7B%22x%22:1385520174.7539697,%22y%22:-210744967.26439902,%22z%22:365738834.422764%7D,%22target%22:%22Saturn%22,%22sizeScale%22:1,%22timeScale%22:60,%22fov%22:35.2,%22ambientLightLevel%22:0.03,%22showAxes%22:false,%22castShadows%22:false,%22shadowType%22:%22Penumbra%22,%22date%22:1719163634078,%22showNames%22:true,%22showDistance%22:true,%22showAltitudeAzimuth%22:true,%22location%22:%7B%22lat%22:43.3752261,%22lon%22:-73.6368939%7D,%22targettingCameraMode%22:%7B%22name%22:%22Follow%20Target%22%7D%7D) - With its [Tidally locked](https://en.wikipedia.org/wiki/Tidal_locking) moons... as are most moons in our solar system.


It has some educational benefits:

* [Watching the horizon/sun from a position abve the arctic cirle](https://vortical.github.io/Orri/?state=%7B%22cameraPosition%22:%7B%22x%22:8000451.26175115,%22y%22:-60574651.21789649,%22z%22:139828578.9001477%7D,%22targetPosition%22:%7B%22x%22:-1046845.5693388648,%22y%22:-212161.4899726349,%22z%22:564069.0322610444%7D,%22target%22:%22Sun%22,%22sizeScale%22:1,%22timeScale%22:86400,%22fov%22:81.4337,%22ambientLightLevel%22:0.03,%22showAxes%22:false,%22castShadows%22:false,%22shadowType%22:%22Penumbra%22,%22date%22:1719256305629,%22showNames%22:true,%22showDistance%22:true,%22showAltitudeAzimuth%22:true,%22location%22:%7B%22lat%22:80,%22lon%22:0%7D,%22targettingCameraMode%22:%7B%22name%22:%22View%20From%20lat,lon%22%7D%7D) - 1 day per second/86,400X ! Endless days...

* Etc ... 


Please note that this application is somewhat still in early stages of development, and there may be some rough edges. Especially the mouse/touchpad interaction has some known issues. If you drag the mouse to orbit around the scene and release the mouse while its over a body, then that body will be selected.


### Navigating Between Celestial Bodies


You can explore different planets and moons by selecting them within the application. Your movement capabilities are determined by the selected camera targeting mode. The currently are 3 camera modes:

* "Follow Target" Camera Mode: This mode maintains the camera at a constant position and direction relative to the selected target. It effectively keeps the target body within the camera view while pointing in the same direction in space.
* "Look at Target" Camera Mode: In this mode, the camera's position remains fixed, but it continuously points towards the selected target. This stationary perspective provides a sense of the slow and majestic movements of celestial bodies in space.
* "Follow From Surface" Camera Mode: This mode positions the camera on the surface of Earth, with the camera direction always pointing towards the selected target. Please note that the camera position remains fixed at the established coordinates on the Earth's surface, with an altitude fixed at 100 meters.



### Camera Control Functions

While in either the "Follow Target" or "Look at Target" camera mode, you can perform the following camera control functions:

* Zooming: Use your mouse scroll button or two-finger drag on a touchpad or mobile display to zoom in and out.
* Orbiting: Click or touch and drag to orbit around the selected target.
* Selecting and Moving: Click on other celestial bodies to select and move towards them at speeds exceeding the speed of light!

While in "Follow From Surface" camera mode, the camera controls will remain fixed at the established coordinates/position on the surface (altitude is fixed at 100m) while the camera direction will ALWAYS be pointing towards the target. Be aware that it is possible for the camera target to be below/behind the surface horizon; in that case, the camera will be pointing down into the surface of Earth and have a 'blocked' view. If the "Show Alt/Az" option is enabled, a negative Alt property value means the target is below the horizon. So while in the "Follow From Surface" camera mode:

* You can click or select different targets. Once a target is set, the view remains pointed towards it regardless of the fact that it is above or below the horizon.


### Time Control
You can control the application's internal clock and time scale to observe celestial bodies at different times and speeds.

* Changing Datetime: Click on the datetime display to bring up the datetime picker. Apply changes by clicking outside the picker.
* Play/Pause: Cick '>' to play and '||' to pause. When play is enabled, the application clock progresses based on the selected time scale. Pausing the clock stops all time-dependent movements of celestial bodies.
* Rewind and Forward: Click repeatedly on '<<' to rewind and '>>' to fast forward, adjusting the time scale in either direction.
* Setting to Current Time: Click on 'Now' to set the clock to the current date and time.
* Resetting Time Scale: Click on '1X' to reset the time scale back to 1X.

If you want to view the bodies in 'real time' (scale is '1X') just click on 'Now'.


### Setting a Location on the Surface
This feature is still rough from a user's perspecive. You have two methods to specify coordinates for positioning on the Earth's surface:
* Manual Input: Enter latitude and longitude coordinates to place a green dot on the Earth's surface. This will set the initial camera position when you switch to the "View From Surface" camera mode.
* Use Browser Location: Clicking this option will utilize your browser's current location via IP geolocation. You'll need to approve the initial location prompt; subsequent requests will bypass this prompt.

The plan is to eventually let users click anywhere on any body to set a location...


### Shadows and Shadow Modes

The application offers the option to enable/disable shadows with two distinct shadow modes: Penumbra and Umbra. Shadows are established using parallel light, with their centers accurately positioned.

* Enabling Shadows: Toggle the shadows on/off to visualize the shadow of the moon on Earth during solar eclipses and other shadow effects.
* Shadow Modes: Choose between Penumbra and Umbra modes. The Umbra represents the darkest, central part of a shadow, while the Penumbra is the surrounding, lighter region. The Umbra effectively represents the area experiencing a 'total' eclipse.

### Field Of View Control
The Field of View (FOV) represents the angle of your view. Imagine opening your arms in front of your eyes—the angle between your arms represents the FOV. The wider you open them, the wider the FOV.

* Adjusting FOV: Use the FOV control to change the viewing angle. A smaller FOV results in a narrow angle with magnified targets. A FOV of approximately 0.5 will make the moon occupy the entire screen, while the minimum value of 0.0001 enables you to [view Pluto from a position on earth](https://vortical.github.io/Orri/?state=%7B%22cameraPosition%22:%7B%22x%22:63018526.976018906,%22y%22:-55058748.599126816,%22z%22:127098970.18596315%7D,%22targetPosition%22:%7B%22x%22:2656466340.2449408,%22y%22:-2057074308.9094815,%22z%22:4026945480.6684427%7D,%22target%22:%22Pluto%22,%22sizeScale%22:1,%22timeScale%22:1,%22fov%22:0.0001,%22ambientLightLevel%22:0.02,%22showAxes%22:false,%22castShadows%22:false,%22shadowType%22:%22Penumbra%22,%22date%22:1721203907721,%22showNames%22:true,%22showDistance%22:true,%22showAltitudeAzimuth%22:true,%22location%22:%7B%22lat%22:43.3752261,%22lon%22:-73.6368939%7D,%22targettingCameraMode%22:%7B%22name%22:%22View%20From%20lat,lon%22%7D%7D) - the indicated labels of distance and Altitude/Azimuth are precise. 


### Displaying Labels in Orri
The app displays labels over celestial objects, which can be easily enabled or disabled according to your preferences. E.g.: to see [a cool view without labels](https://vortical.github.io/Orri/?state=%7B%22cameraPosition%22:%7B%22x%22:68471723.92024241,%22y%22:-54204841.74759455,%22z%22:125029454.69148888%7D,%22targetPosition%22:%7B%22x%22:68459449.33861451,%22y%22:-54179567.21320115,%22z%22:124976441.44374596%7D,%22target%22:%22Moon%22,%22sizeScale%22:1,%22timeScale%22:10800,%22fov%22:30.8924,%22ambientLightLevel%22:0.03,%22showAxes%22:false,%22castShadows%22:false,%22shadowType%22:%22Penumbra%22,%22date%22:1721410006342,%22showNames%22:false,%22showDistance%22:false,%22showAltitudeAzimuth%22:true,%22location%22:%7B%22lat%22:43.3752261,%22lon%22:-73.6368939%7D,%22targettingCameraMode%22:%7B%22name%22:%22Follow%20Target%22%7D%7D). There are three types of labels:

* Body Name: This label indicates the name of the celestial body.
* Body Distance from the Camera: Distances can be configured to display in Astronomical Units (Au), kilometers (km), or miles. This provides valuable context on the spatial relationship between objects and the viewer.
* Altitude/Azimuth Coordinates: This label is specific to the viewer's perspective and is only visible when using the "View From Surface" camera mode. For more information on the altaz coordinates, you can refer to Wikipedia's page on the Horizontal Coordinate System. This label also depicts a small arrow that is either pointing up: ↑ or down: ↓ which indicates if the body is currently trending/moving up or down in elevation.
