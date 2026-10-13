
export type CDCArticle = {
  id: number;
  name: string;
  description: string;
  targetUrl: string;
  thumbnailUrl?: string;
  datePublished?: string;
  topic?: string;
};

type CDCMediaItem = {
  id?: number;
  name?: string;
  description?: string | null;
  targetUrl?: string;
  sourceUrl?: string;
  thumbnailUrl?: string;
  datePublished?: string;
  mediaType?: string;
  status?: string;
  language?: { isoCode2?: string };
  tags?: { name?: string; type?: string }[];
};

type CDCResponse = {
  meta?: { status?: number };
  results?: CDCMediaItem[];
};

const CDC_MEDIA_URL =
  "https://tools.cdc.gov/api/v2/resources/media?max=30&sort=datePublished&order=DESC";

export async function getCDCArticles(): Promise<CDCArticle[]> {
  const response = await fetch(CDC_MEDIA_URL);

  if (!response.ok) {
    throw new Error(
      "CDC articles could not be loaded. Please try again."
    );
  }

  const data = (await response.json()) as CDCResponse;

  if (data.meta?.status && data.meta.status !== 200) {
    throw new Error("The CDC service returned an error.");
  }

  return (data.results ?? [])
    .filter((item) => {
      const title = item.name?.trim();
      const url = item.targetUrl || item.sourceUrl;

      return (
        item.status === "Published" &&
        item.mediaType === "HTML" &&
        item.language?.isoCode2 === "en" &&
        Boolean(title && url && /^https:\/\//i.test(url)) &&
        Boolean(item.description?.trim())
      );
    })
    .slice(0, 5)
    .map((item) => ({
      id: item.id ?? Math.random(),
      name: item.name!.trim(),
      description: item.description!
        .replace(/\s+/g, " ")
        .trim(),
      targetUrl: item.targetUrl || item.sourceUrl!,
      thumbnailUrl: item.thumbnailUrl || undefined,
      datePublished: item.datePublished || undefined,
      topic: item.tags?.find(
        (tag) => tag.type === "Topic"
      )?.name,
    }));
}
