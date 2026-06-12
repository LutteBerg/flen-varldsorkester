export function renderLlmsText(snapshot, origin) {
  const global = snapshot?.global || {};
  const lines = [
    `# ${global.siteTitle || 'Kulturföreningen FlenVärldsOrkester'}`,
    '',
    global.homeIntro || '',
    global.aboutText || '',
    '',
    '## Kontakt',
    global.contactInfo?.address || '',
    global.contactInfo?.email || '',
    '',
    '## Viktiga sidor',
    `- Hem: ${origin}/`,
    `- Om Amazon i Flen: ${origin}/about`,
    `- Kontakt: ${origin}/contact`,
  ];

  for (const section of snapshot?.sections || []) {
    const sectionUrl = `${origin}/${section.slug}`;
    lines.push(
      `- ${section.title}: ${sectionUrl}`,
      `  ${singleLine(section.shortDescription)}`,
      `- ${section.title} – evenemang: ${sectionUrl}/evenemang`,
      `- ${section.title} – nyheter: ${sectionUrl}/nyheter`,
      `- ${section.title} – galleri: ${sectionUrl}/galleri`,
    );

    for (const child of section.childPages || []) {
      lines.push(
        `- ${child.title}: ${sectionUrl}/${child.slug}`,
        `  ${singleLine(child.shortDescription)}`,
        `- ${child.title} – evenemang: ${sectionUrl}/${child.slug}/evenemang`,
      );
    }
  }

  lines.push(
    '',
    '## Innehåll',
    'Webbplatsen publicerar information om verksamheter, nyheter, evenemang, bilder och videor.',
  );

  return `${lines.filter((line, index, all) => (
    line || (index > 0 && all[index - 1])
  )).join('\n').trim()}\n`;
}

function singleLine(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}
