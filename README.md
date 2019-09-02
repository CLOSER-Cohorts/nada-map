# nada-map

NADA Map extension

## Installation

 1. Copy the `mapfiles` folder to the root directory of your NADA installation
 2. Install the *Map_viewer* NADA library: <br>Copy the `application/libraries/Map_viewer` folder to `{nada-root}/application/libraries/Map_viewer`
 3. Install the custom homepage controller: <br>Copy `application/controllers/custom/Homepage.php` to `{nada-root}/application/controllers/custom/Homepage.php`
 4. Install the custom homepage view: <br>Copy `application/views/static/custom/home.php` to `{nada-root}/application/views/static/custom/home.php`
 5. Add the following rule to your routing configuration file `{nada-root}/application/config/routes.php`: <br><br>`$route['home'] = 'custom/homepage';`
