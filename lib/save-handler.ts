const STORAGE_KEY = "oys_pending_story";

type HandleSaveParams = {
  title: string;
  story: string;
  categoryId: string;
  categoryLabel: string;
  accent: string;
  setLoading: (v: boolean) => void;
};

export async function handleSave({
  title,
  story,
  categoryId,
  categoryLabel,
  accent,
  setLoading,
}: HandleSaveParams): Promise<void> {
  setLoading(true);
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
      title,
      content: story,
      categoryId,
      categoryLabel,
      accent,
    }));
    const res = await fetch("/api/checkout", { method: "POST" });
    const data = await res.json();
    if (data.url) window.location.href = data.url;
  } catch {
    setLoading(false);
  }
}
