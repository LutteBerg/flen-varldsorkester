import React from 'react';

// Render a plain-text string as React nodes, preserving line breaks and
// turning bare URLs / e-mail addresses into clickable links. Used by the
// news modal and the event detail page so admins can paste links into the
// description/body fields and have them work on the public site.

const URL_RE = /(https?:\/\/[^\s<]+[^\s<.,:;!?)\]}'"])|(www\.[^\s<]+[^\s<.,:;!?)\]}'"])|([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})/g;

function renderLine(line, lineKey) {
  const nodes = [];
  let lastIndex = 0;
  let match;
  URL_RE.lastIndex = 0;
  while ((match = URL_RE.exec(line)) !== null) {
    const [token] = match;
    if (match.index > lastIndex) {
      nodes.push(line.slice(lastIndex, match.index));
    }
    let href;
    if (token.includes('@') && !token.startsWith('http')) {
      href = `mailto:${token}`;
    } else if (token.startsWith('www.')) {
      href = `https://${token}`;
    } else {
      href = token;
    }
    nodes.push(
      <a
        key={`${lineKey}-l-${match.index}`}
        href={href}
        target={href.startsWith('mailto:') ? undefined : '_blank'}
        rel="noopener noreferrer"
      >
        {token}
      </a>
    );
    lastIndex = match.index + token.length;
  }
  if (lastIndex < line.length) {
    nodes.push(line.slice(lastIndex));
  }
  return nodes;
}

export function linkify(text) {
  if (!text) return null;
  const lines = String(text).split(/\r?\n/);
  return lines.map((line, i) => (
    <React.Fragment key={`line-${i}`}>
      {renderLine(line, i)}
      {i < lines.length - 1 && <br />}
    </React.Fragment>
  ));
}
