
export function createMaterials(scene, materiales) {
	// Create marmolnegro material
	materiales.marmolnegroMat = new BABYLON.PBRMaterial("marmolnegroMatMaterial", scene);
	const texturePath = "textures/marmolnegro/Marble016_4K-JPG_";
	materiales.marmolnegroMat.albedoTexture = new BABYLON.Texture(texturePath + "Color.jpg", scene);
	materiales.marmolnegroMat.bumpTexture = new BABYLON.Texture(texturePath + "NormalGL.jpg", scene);
	materiales.marmolnegroMat.roughnessTexture = new BABYLON.Texture(texturePath + "Roughness.jpg", scene);
	materiales.marmolnegroMat.displacementTexture = new BABYLON.Texture(texturePath + "Displacement.jpg", scene);
	materiales.marmolnegroMat.useParallax = true;                // Efecto más suave
	materiales.marmolnegroMat.useParallaxOcclusion = true;       // Más realista pero más pesado
	materiales.marmolnegroMat.parallaxScaleBias = 0.02;          // Ajusta según el efecto deseado
	materiales.marmolnegroMat.metallic = 0.0;  // Mármol no es metálico
	materiales.marmolnegroMat.roughness = 1.0; // Si no se usa textura, define cuán áspero es

	// Runas variation
	materiales.marmolnegroRunasMat = materiales.marmolnegroMat.clone("marmolnegroRunasMat");
	materiales.marmolnegroRunasMat.emissiveTexture = new BABYLON.Texture("textures/runas.png", scene);
	materiales.marmolnegroRunasMat.emissiveColor = new BABYLON.Color3(1, 0.84, 0);

	// Material Pala 1
	materiales.pala2Mat = new BABYLON.PBRMaterial("pala2Mat", scene);
	materiales.pala2Mat.albedoColor = new BABYLON.Color3(0.2, 0.6, 1); // Azul celeste
	materiales.pala2Mat.emissiveColor = new BABYLON.Color3(0.2, 0.6, 1); // Emisión tenue
	materiales.pala2Mat.alpha = 0.75;
	materiales.pala2Mat.transparencyMode = BABYLON.PBRMaterial.PBRMATERIAL_ALPHABLEND;
	materiales.pala2Mat.indexOfRefraction = 1.4;
	materiales.pala2Mat.metallic = 0.1;
	materiales.pala2Mat.roughness = 0.2;
	materiales.pala2Mat.subSurface.isRefractionEnabled = true;
	materiales.pala2Mat.subSurface.refractionIntensity = 0.6;
	materiales.pala2Mat.subSurface.indexOfRefraction = 1.4;

	// Material Pala 2
	materiales.pala1Mat = new BABYLON.PBRMaterial("pala1Mat", scene);
	materiales.pala1Mat.albedoColor = new BABYLON.Color3(1, 0.0, 0.1); // Rojo jade
	materiales.pala1Mat.emissiveColor = new BABYLON.Color3(1, 0.0, 0.05); // Emisión tenue
	materiales.pala1Mat.alpha = 0.75;
	materiales.pala1Mat.transparencyMode = BABYLON.PBRMaterial.PBRMATERIAL_ALPHABLEND;
	materiales.pala1Mat.indexOfRefraction = 1.4;
	materiales.pala1Mat.metallic = 0.1;
	materiales.pala1Mat.roughness = 0.2;
	materiales.pala1Mat.subSurface.isRefractionEnabled = true;
	materiales.pala1Mat.subSurface.refractionIntensity = 0.6;
	materiales.pala1Mat.subSurface.indexOfRefraction = 1.4;

	// Material Pala 3 - Verde Esmeralda
	materiales.pala3Mat = new BABYLON.PBRMaterial("pala3Mat", scene);
	materiales.pala3Mat.albedoColor = new BABYLON.Color3(0.1, 0.9, 0.4); // Verde esmeralda vibrante
	materiales.pala3Mat.emissiveColor = new BABYLON.Color3(0.05, 0.8, 0.3); // Emisión tenue verde
	materiales.pala3Mat.alpha = 0.75;
	materiales.pala3Mat.transparencyMode = BABYLON.PBRMaterial.PBRMATERIAL_ALPHABLEND;
	materiales.pala3Mat.indexOfRefraction = 1.4;
	materiales.pala3Mat.metallic = 0.1;
	materiales.pala3Mat.roughness = 0.2;
	materiales.pala3Mat.subSurface.isRefractionEnabled = true;
	materiales.pala3Mat.subSurface.refractionIntensity = 0.6;
	materiales.pala3Mat.subSurface.indexOfRefraction = 1.4;

	// Material Pala 4 - Púrpura Mágico
	materiales.pala4Mat = new BABYLON.PBRMaterial("pala4Mat", scene);
	materiales.pala4Mat.albedoColor = new BABYLON.Color3(0.8, 0.2, 1); // Púrpura/magenta vibrante
	materiales.pala4Mat.emissiveColor = new BABYLON.Color3(0.7, 0.1, 0.9); // Emisión tenue púrpura
	materiales.pala4Mat.alpha = 0.75;
	materiales.pala4Mat.transparencyMode = BABYLON.PBRMaterial.PBRMATERIAL_ALPHABLEND;
	materiales.pala4Mat.indexOfRefraction = 1.4;
	materiales.pala4Mat.metallic = 0.1;
	materiales.pala4Mat.roughness = 0.2;
	materiales.pala4Mat.subSurface.isRefractionEnabled = true;
	materiales.pala4Mat.subSurface.refractionIntensity = 0.6;
	materiales.pala4Mat.subSurface.indexOfRefraction = 1.4;

	// Material metal PBR
	materiales.metalMat = new BABYLON.PBRMaterial("metalMat", scene);
	materiales.metalMat.albedoTexture = new BABYLON.Texture(
		"https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/rusty_metal_04/rusty_metal_04_diff_1k.jpg",
		scene
	);
	materiales.metalMat.roughness = 0.8; // algo de brillo metálico
	materiales.metalMat.metallic = 1;

	// Material Concrete para las patas
	materiales.concreteMat = new BABYLON.PBRMaterial("concreteMat", scene);
	materiales.concreteMat.albedoTexture = new BABYLON.Texture("textures/concrete_0014_color_2k.jpg", scene);
	materiales.concreteMat.bumpTexture = new BABYLON.Texture("textures/concrete_0014_normal_opengl_2k.png", scene);
	materiales.concreteMat.ambientTexture = new BABYLON.Texture("textures/concrete_0014_ao_2k.jpg", scene);
	materiales.concreteMat.roughness = 0.9;
	materiales.concreteMat.metallic = 0.1;
	// Usar parallax para dar profundidad
	materiales.concreteMat.parallaxTexture = new BABYLON.Texture("textures/concrete_0014_height_2k.png", scene);
	materiales.concreteMat.useParallax = true;
	materiales.concreteMat.useParallaxOcclusion = true;
	materiales.concreteMat.parallaxScaleBias = 0.08;

	// Ajuste de definicion de las texturas
	const scale = 2; // o prueba con 6 u 8 para más detalle

	materiales.concreteMat.albedoTexture.uScale = scale;
	materiales.concreteMat.albedoTexture.vScale = scale;
	materiales.concreteMat.bumpTexture.uScale = scale;
	materiales.concreteMat.bumpTexture.vScale = scale;
	materiales.concreteMat.ambientTexture.uScale = scale;
	materiales.concreteMat.ambientTexture.vScale = scale;
	materiales.concreteMat.parallaxTexture.uScale = scale;
	materiales.concreteMat.parallaxTexture.vScale = scale;

	materiales.concreteMat.albedoTexture.anisotropicFilteringLevel = 16;

	// Material de bloques medievales para el borde de la mesa
	materiales.marbleMat = new BABYLON.PBRMaterial("marbleMat", scene);
	materiales.marbleMat.albedoTexture = new BABYLON.Texture("textures/medieval_blocks_06_diff_2k.jpg", scene);
	materiales.marbleMat.bumpTexture = new BABYLON.Texture("textures/medieval_blocks_06_nor_gl_2k.png", scene);
	materiales.marbleMat.metallicTexture = new BABYLON.Texture("textures/medieval_blocks_06_rough_2k.jpg", scene);
	materiales.marbleMat.useRoughnessFromMetallicTextureAlpha = true;
	materiales.marbleMat.metallic = 0.1;
	materiales.marbleMat.roughness = 0.6; // Ajustado para bloques de piedra
	materiales.marbleMat.parallaxTexture = new BABYLON.Texture("textures/medieval_blocks_06_disp_2k.png", scene);
	materiales.marbleMat.useParallax = true;
	materiales.marbleMat.useParallaxOcclusion = true;
	materiales.marbleMat.parallaxScaleBias = 0.08;

	// Ajustes adicionales para mejor calidad visual
	materiales.marbleMat.albedoTexture.anisotropicFilteringLevel = 16;
	materiales.marbleMat.albedoTexture.wrapU = BABYLON.Texture.WRAP_ADDRESSMODE;
	materiales.marbleMat.albedoTexture.wrapV = BABYLON.Texture.WRAP_ADDRESSMODE;

	// Aplicar el mismo modo de wrap a las otras texturas
	materiales.marbleMat.bumpTexture.wrapU = BABYLON.Texture.WRAP_ADDRESSMODE;
	materiales.marbleMat.bumpTexture.wrapV = BABYLON.Texture.WRAP_ADDRESSMODE;
	materiales.marbleMat.metallicTexture.wrapU = BABYLON.Texture.WRAP_ADDRESSMODE;
	materiales.marbleMat.metallicTexture.wrapV = BABYLON.Texture.WRAP_ADDRESSMODE;
	materiales.marbleMat.parallaxTexture.wrapU = BABYLON.Texture.WRAP_ADDRESSMODE;
	materiales.marbleMat.parallaxTexture.wrapV = BABYLON.Texture.WRAP_ADDRESSMODE;
}