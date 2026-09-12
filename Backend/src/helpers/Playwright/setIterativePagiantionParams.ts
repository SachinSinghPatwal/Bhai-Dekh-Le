export function setIterativePaginationParams(url: URL, i: number) {
  url.searchParams.set("noOfResults", "2");
  url.searchParams.set("pageNo", `${i}`);
}
