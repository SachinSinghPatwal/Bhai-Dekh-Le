export function setIterativePaginationParams(url: URL, i: number) {
  url.searchParams.set("noOfResults", "20");
  url.searchParams.set("pageNo", `${i}`);
}
