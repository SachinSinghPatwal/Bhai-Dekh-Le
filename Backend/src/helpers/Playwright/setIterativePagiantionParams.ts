export function setIterativePaginationParams(url: URL, i: number = 1) {
  url.searchParams.set("noOfResults", "20");
  url.searchParams.set("pageNo", `${i}`);
}
