// Landing artwork is rendered by public/assets/landing-showcase.css.
// Keep this module intentionally minimal so no runtime DOM injection can hide or replace it.
document.querySelectorAll('.gc-force-showcase').forEach((node) => node.remove())
const staleStyle = document.getElementById('gc-force-showcase-style')
if (staleStyle) staleStyle.remove()
