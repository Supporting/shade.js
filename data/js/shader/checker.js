/**
 *
 * @param env Parameters from the current environment
 * @param env.texCoord {Point} Texture coordinates
 * @param env.frequency {number} Frequency of the checkerboard pattern
 * @param env.whiteColor {Color} Light color of the checkerboard
 * @param env.blackColor {Color} Dark color of the checkerboard
 * @param env.normal {Normal} Surface normal
 * @param env.shininess {number} Roughness of the surface
 * @return {*}
 */
function shade(env) {

    var smod = (env.texCoord.x * env.frequency) % 1.0,
        tmod = (env.texCoord.y * env.frequency) % 1.0,
        color;

    color = ((smod < 0.5 && tmod < 0.5) || (smod >= 0.5 && tmod >= 0.5)) ?
        env.whiteColor :
        env.blackColor;

    var normal = Shade.normalize(Shade.transform("world", env.normal));
    return color * this.diffuse(normal) + this.phong(normal, env.shininess);
}