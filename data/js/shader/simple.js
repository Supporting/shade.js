function shade(env) {

    var diffuseColor = env.diffuseColor || new Color(255,0,0);
    if(env.diffuseTexture) {
        diffuseColor.multiply(env.diffuseTexture.sample(env.texcoord));
    }
    return Shade.diffuse(env.normal, diffuseColor);

}
