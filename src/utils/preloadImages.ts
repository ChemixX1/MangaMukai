const imageRequests = new Map<string, Promise<void>>();

const preloadImage = (source: string): Promise<void> => {
  if (!source || typeof Image === "undefined") return Promise.resolve();

  const pending = imageRequests.get(source);
  if (pending) return pending;

  const request = new Promise<void>((resolve) => {
    const image = new Image();
    let finished = false;
    let timeout = 0;
    const finish = () => {
      if (finished) return;
      finished = true;
      window.clearTimeout(timeout);
      resolve();
    };

    const decodeAndFinish = async () => {
      if (finished) return;
      try {
        await image.decode();
      } catch {
        // onload ya confirma que el recurso llegó; decode puede no estar disponible.
      }
      finish();
    };

    image.decoding = "async";
    image.onload = () => { void decodeAndFinish(); };
    image.onerror = finish;
    timeout = window.setTimeout(finish, 3500);
    image.src = source;
    if (image.complete) {
      if (image.naturalWidth > 0) void decodeAndFinish();
      else finish();
    }
  });

  imageRequests.set(source, request);
  return request;
};

export const preloadImages = async (sources: string[]): Promise<void> => {
  const uniqueSources = [...new Set(sources.filter(Boolean))];
  await Promise.allSettled(uniqueSources.map(preloadImage));
};
