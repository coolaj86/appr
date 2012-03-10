(function () {
    "use strict";

    /*
     * Converts from an arbitrary unit set to screen coordinates.
     * All points must have an x and a y.
     *
     * Preserves ratio.  If the screen has a different aspect ratio than
     * the original, the original is preserved.
     *
     * @param point- Point to convert
     * @param bottomLeft- Bottom left of original coordinate system
     * @param topRight- Top right of original coordinate system
     * @param width- width of screen
     * @param height- height of screen
     * @return Screen coordinates
     */
    function unitsToScreen(point, bottomLeft, topRight, width, height, xOffset, yOffset) {
        var ratio, bounds, screenBounds, screen;

        bounds = {
            minX: bottomLeft.x,
            minY: bottomLeft.y,
            maxX: topRight.x,
            maxY: topRight.y
        };

        screenBounds = {
            width: width,
            height: height
        };

        ratio = getMultiplier(bounds, screenBounds, xOffset, yOffset);

        screen = {
            x: Math.round(point.x * ratio + (width / 2 + xOffset)),
            // y coordinates are flipped
            y: Math.round(height - (point.y * ratio))
        };

        return screen;
    }

    /*
     * Converts from screen point to an arbitrary unit system.
     * All points must have an x and a y.
     *
     * Preserves ratio.  If the screen has a different aspect ratio than
     * the new point system, the screen ratio is preserved.
     *
     * @param screen- Screen point to convert
     * @param bottomLeft- Bottom left of original coordinate system
     * @param topRight- Top right of original coordinate system
     * @param width- width of screen
     * @param height- height of screen
     * @return New coordinates
     */
    function screenToUnits(screen, bottomLeft, topRight, width, height) {
        var xRatio, yRatio, ratio, point;

        xRatio = (topRight.x - bottomLeft.x) / width;
        yRatio = (topRight.y - bottomLeft.y) / height;

        ratio = Math.min(xRatio, yRatio);

        point = {
            x: Math.round(screen.x * ratio + bottomLeft.x),
            // y coordinates are flipped
            y: Math.round(screen.y * ratio + bottomLeft.y)
        };

        return point;
    }

    function getMultiplier(coordinateBounds, screenBounds, xOffset, yOffset) {
        var xRatio, yRatio, width, height;

        width = screenBounds.width - (xOffset || 0);
        height = screenBounds.height - (yOffset || 0);

        xRatio = width / (coordinateBounds.maxX - coordinateBounds.minX);
        yRatio = height / (coordinateBounds.maxY - coordinateBounds.minY);

        return Math.min(xRatio, yRatio);
    }

    /*
     * Function to get GPS coordinate given starting GPS, distance and bearing:
     * Taken from http://www.movable-type.co.uk/scripts/latlong.html
     *
     * Original equation
     * lat2 = asin(sin(lat1)*cos(d/R) + cos(lat1)*sin(d/R)*cos(θ))
     * lon2 = lon1 + atan2(sin(θ)*sin(d/R)*cos(lat1), cos(d/R)−sin(lat1)*sin(lat2))
     * 
     * This function has been cleaned up a little from the original.
     * Long lines were broken up into small fragments.
     * 
     * @param origin- GPS coordinate (must have latitude & longitude properties)
     * @param distance- Distance in meters from original
     * @param angle- Angle in radians from original
     * @return New GPS coordinate (has latitude & longitude properties)
     */

    function calculateGPS(origin, distance, angle) {
        var radius = 6371100, // radius of the Earth in meters
            lat2, // new latitude
            lon2, // new longitude
            point, // return point
            tInside1, // convenience variable to simplify code
            tInside2, // convenience variable to simplify code
            angDist = distance / radius; // angular distance


        /* Calculate Latitude */


        // separated so everything looks cleaner
        tInside1 = Math.sin(origin.latitude) * Math.cos(angDist);
        tInside2 = Math.cos(origin.latitude) * Math.sin(angDist) * Math.cos(angle);

        lat2 = Math.asin(tInside1 + tInside2);


        /* Calculate Longitude */


        // separated so everything looks cleaner
        tInside1 = Math.sin(angle) * Math.sin(angDist) * Math.cos(origin.latitude);
        tInside2 =  Math.cos(angDist) - Math.sin(origin.latitude) * Math.sin(lat2);

        lon2 = origin.longitude + Math.atan2(tInside1, tInside2);

        point = {
            latitude: lat2,
            longitude: lon2
        };

        return point;
    }


    /**
     *  Resolves any angle (in degrees) to an angle in the range [0..upperBound)
     *  (including 0 but not including upperBound)
     *
     *  @param IN `angle` The arbitrary angle to be resolved. Must be of type
     *    'number'.
     *  @return An equivalent angle to the input `angle`, but in the range
     *    [0..upperBound)
     *  @throws TypeError if `angle` is not of type 'number' or is NaN
     */
    function resolveAngle (angle) {
      var outAngle
        , upperBound = 360
        , errorMessage = 'angle must be of type \'number\'' 
        ;

      if (('number' !== typeof angle) || (isNaN(angle))) {
        throw new TypeError(errorMessage);
      }

      outAngle = angle % upperBound;

      /*
        In JavaScript, the modulus operator returns the integer remainder of
        division between two numbers, with the sign of the first number. So
        -10 % 3 = -1 whereas 10 % 3 = 1. For this reason, if outAngle is less
        than 0, then we must add upperBound to outAngle to ensure the final
        result is greater than 0. For more information on the modulus operator see
        https://developer.mozilla.org/en/JavaScript/Reference/Operators/Arithmetic_Operators
      */
      if (outAngle < 0) {
        outAngle += upperBound;
      }

      return outAngle;
    }


    module.exports.unitsToScreen = unitsToScreen;
    module.exports.screenToUnits = screenToUnits;
    module.exports.getMultiplier = getMultiplier;
    module.exports.calculateGPS = calculateGPS;
    module.exports.resolveAngle = resolveAngle;
}());
