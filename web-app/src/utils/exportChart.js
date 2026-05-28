/**
 * Export a container's SVG chart as a high-DPI PNG download.
 * Resolves CSS var colors to computed values so the rasterized output is correct.
 */
export function exportChart(containerEl, filename = 'chart.png') {
  const svg = containerEl.querySelector('svg');
  if (!svg) return;

  const clone = svg.cloneNode(true);

  // Resolve CSS variables to actual colors
  const computed = getComputedStyle(document.documentElement);

  const resolveVar = (value) => value.replace(/var\(([^)]+)\)/g, (_, prop) =>
    computed.getPropertyValue(prop.trim()).trim()
  );

  clone.querySelectorAll('[stroke]').forEach(el => {
    const v = el.getAttribute('stroke');
    if (v && v.includes('var(')) el.setAttribute('stroke', resolveVar(v));
  });
  clone.querySelectorAll('[fill]').forEach(el => {
    const v = el.getAttribute('fill');
    if (v && v.includes('var(')) el.setAttribute('fill', resolveVar(v));
  });
  clone.querySelectorAll('[style]').forEach(el => {
    const style = el.getAttribute('style');
    if (style && style.includes('var(')) el.setAttribute('style', resolveVar(style));
  });

  // Set explicit bg so PNG isn't transparent
  const bg = computed.getPropertyValue('--bg-primary').trim();
  const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  rect.setAttribute('width', '100%');
  rect.setAttribute('height', '100%');
  rect.setAttribute('fill', bg);
  clone.insertBefore(rect, clone.firstChild);

  const { width, height } = svg.getBoundingClientRect();
  const scale = 2;
  clone.setAttribute('width', width);
  clone.setAttribute('height', height);

  const svgData = new XMLSerializer().serializeToString(clone);
  const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);

  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = width * scale;
    canvas.height = height * scale;
    const ctx = canvas.getContext('2d');
    ctx.scale(scale, scale);
    ctx.drawImage(img, 0, 0);
    URL.revokeObjectURL(url);

    canvas.toBlob(blob => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      a.click();
      URL.revokeObjectURL(a.href);
    }, 'image/png');
  };
  img.src = url;
}
