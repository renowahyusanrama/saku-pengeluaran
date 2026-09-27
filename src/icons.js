const paths = {
  pocket: '<path d="M5 4h14v10c0 5-7 8-7 8s-7-3-7-8Z"/><path d="m8.5 10 3.5 3 3.5-3"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  arrow: '<path d="M5 12h14m-5-5 5 5-5 5"/>',
  left: '<path d="m14 6-6 6 6 6"/>',
  right: '<path d="m10 6 6 6-6 6"/>',
  down: '<path d="m7 10 5 5 5-5"/>',
  calendar: '<rect x="4" y="5" width="16" height="16" rx="3"/><path d="M8 3v4m8-4v4M4 11h16m-11 4h.01M12 15h.01M15 15h.01"/>',
  download: '<path d="M12 3v12m-4-4 4 4 4-4M5 15v5h14v-5"/>',
  upload: '<path d="M12 16V4m-4 4 4-4 4 4M5 15v5h14v-5"/>',
  file: '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9Z"/><path d="M14 3v6h6M8 13h8m-8 4h5"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4.5 4.5"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  edit: '<path d="m15 5 4 4M4 20l4-1L20 7a2.8 2.8 0 0 0-4-4L4 15Z"/>',
  trash: '<path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7"/>',
  lock: '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10h.01"/>',
  receipt: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2Z"/><path d="M9 7h6m-6 4h6m-6 4h3"/>',
  leaf: '<path d="M20 4c-9-2-17 2-15 10a5 5 0 0 0 7 5c6-2 7-9 8-15ZM4 21 15 10"/>',
  food: '<path d="M4 3v7a3 3 0 0 0 6 0V3M7 3v18m11-18c-3 3-3 8 0 9h2V3Zm2 9v9"/>',
  transport: '<path d="m5 7 2-4h10l2 4 2 3v8H3v-8Zm-2 4h18M5 18v3m14-3v3M6 14h2m8 0h2"/>',
  shopping: '<path d="M5 7h14l1 14H4ZM9 8V6a3 3 0 0 1 6 0v2"/>',
  bills: '<path d="m13 2-9 12h7l-1 8 10-12h-7Z"/>',
  fun: '<path d="M6 8h12a3 3 0 0 1 3 3l1 7a2 2 0 0 1-3 2l-4-3H9l-4 3a2 2 0 0 1-3-2l1-7a3 3 0 0 1 3-3ZM6 13h4m-2-2v4m8-2h.01m2 2h.01M12 8V4"/>',
  health: '<path d="M12 21S3 15 3 8a5 5 0 0 1 9-3 5 5 0 0 1 9 3c0 7-9 13-9 13Z"/><path d="M9 12h6m-3-3v6"/>',
  other: '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
};

export function icon(name, className = '') {
  return `<svg class="icon ${className}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.other}</svg>`;
}
