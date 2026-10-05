/** Safari's native AAC encoder avoids WebM/Opus recording interoperability issues. */
export function recordingMimeType(userAgent: string, isSupported: (mimeType: string) => boolean): string | undefined {
  const webkit = /iPad|iPhone|iPod/.test(userAgent)
    || (/Safari\//.test(userAgent) && !/Chrome\/|Chromium\/|Edg\/|OPR\//.test(userAgent));
  const aac = ['audio/mp4;codecs=mp4a.40.2', 'audio/mp4'];
  const opus = ['audio/webm;codecs=opus', 'audio/webm'];
  return (webkit ? [...aac, ...opus] : [...opus, ...aac]).find(isSupported);
}
