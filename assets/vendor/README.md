# Paper mesh gradient

`paper-mesh.js` bundles `ShaderMount`, `meshGradientFragmentShader`, and
`getShaderColorFromString` from the official `@paper-design/shaders@0.0.80`
npm distribution. Built with `esbuild@0.25.12`, using `--bundle --minify
--format=esm --target=es2020`. No shader source was modified.

Source: https://github.com/paper-design/shaders
Component: https://shaders.paper.design/mesh-gradient

The Apache 2.0 license and original notice are preserved in
`PAPER-LICENSE.txt` and `PAPER-NOTICE.txt`.

## React Bits specular buttons

`specular-rim.js` preserves the fragment shader from React Bits' Specular Button
component, retrieved September 16, 2026. `pill-motion.js` adapts its uniforms and
pointer response to the existing Paper renderer, with rounded pill geometry,
on-demand animation, visibility handling and reduced-motion support. The site
does not require React or OGL.

Source: https://github.com/DavidHDev/react-bits/tree/main/src/content/Components/SpecularButton
Component: https://reactbits.dev/components/specular-button

The original MIT license with Commons Clause is preserved in
`REACT-BITS-LICENSE.txt`.

## React Bits Silk and Blur Text

`silk.js` adapts the official Silk fragment shader to GLSL 300 and the existing
renderer's screen-space UVs and clock. Pattern, grain and color calculations
are unchanged. Hero settings: color `#5c0b34`, speed `2.3`, scale `0.8`, noise
`1.5`, rotation `0`; the clock advances at `0.1 * delta` as in the React source.

Source: https://github.com/DavidHDev/react-bits/blob/main/src/content/Backgrounds/Silk/Silk.jsx
Reference: https://reactbits.dev/backgrounds/silk?color=5c0b34&speed=2.3&scale=0.8

The headline's one-time CSS word stagger adapts the free Blur Text component's
blur, opacity and vertical-movement keyframes. Travel and timing are reduced
for this hero. These effects share the React Bits license above.

Source: https://github.com/DavidHDev/react-bits/blob/main/src/content/TextAnimations/BlurText/BlurText.jsx
