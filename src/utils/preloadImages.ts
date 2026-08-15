const imageRequests = new Map<string, Promise<void>>();

const preloadImage = (source: string): Promise<void> => {
  if (!source || typeof Image === "undefined") return Promise.resolve();

  const pending = imageRequests.get(source);
  if (pending) return pending;

  const request = new Promise<void>((resolve) => {
    const image = new Image();
    let finished = false;
    const timeout = window.setTimeout(() => finish(), 1800);
    const finish = () => {
      if (finished) return;
      finished = true;
      window.clearTimeout(timeout);
      resolve();
    };

    image.decoding = "async";
    image.onload = finish;
    image.onerror = finish;
    image.src = source;
    if (image.complete) finish();
  });

  imageRequests.set(source, request);
  return request;
};

export const preloadImages = async (sources: string[]): Promise<void> => {
  const uniqueSources = [...new Set(sources.filter(Boolean))];
  await Promise.allSettled(uniqueSources.map(preloadImage));
};
