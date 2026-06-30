export function getProductImageUrl(url, type = 'thumbnail') {
  if (!url) return '';

  // Check if it's a Supabase / InsForge Storage URL
  const isSupabase = url.includes('supabase.co') || url.includes('insforge') || url.includes('supabase.in') || url.includes('localhost:54321');

  if (isSupabase) {
    // If it's a Supabase/InsForge URL, append query params.
    // Standard parameters: width=400&format=webp or width=800&format=webp
    const separator = url.includes('?') ? '&' : '?';
    const width = type === 'thumbnail' ? 400 : 800;
    return `${url}${separator}width=${width}&format=webp`;
  } else {
    // Use Cloudinary free tier (demo cloud name fetch API)
    const width = type === 'thumbnail' ? 400 : 800;
    let absoluteUrl = url;
    if (url.startsWith('/')) {
      absoluteUrl = window.location.origin + url;
    }
    return `https://res.cloudinary.com/demo/image/fetch/w_${width},f_webp/${absoluteUrl}`;
  }
}
